// Continuity token server for the QuestOmni continuity page (/?invitation=<id>&code=<code>).
//
// Artemis only lets a *verified* web visitor open a live_participant continuity invitation. The verified identity comes
// from a hosted_exchange SDK channel: this server holds that channel's server secret, asks Artemis Runtime for a
// single-use bootstrap token (POST /api/v1/sdk/customer-sessions), and hands only the token to the browser.
// The browser never sees the secret. No dependencies; Node 18+.
//
// Environment (set on the host, never in git):
//   ARTEMIS_SDK_CHANNEL_SECRET   required  hosted_exchange channel server secret (or ARTEMIS_SDK_CHANNEL_SECRET_FILE)
//   ARTEMIS_SDK_CHANNEL_ID       required  hosted_exchange SDK channel id
//   ARTEMIS_TENANT_ID            required
//   ARTEMIS_PROJECT_ID           required
//   ARTEMIS_RUNTIME_BASE_URL     default https://agents.kore.ai
//   ALLOWED_ORIGINS              comma list, default https://questomni.onrender.com
//   PORT                         default 8787
import http from 'node:http';
import fs from 'node:fs';

const env = process.env;
const SECRET = (env.ARTEMIS_SDK_CHANNEL_SECRET || (env.ARTEMIS_SDK_CHANNEL_SECRET_FILE ? fs.readFileSync(env.ARTEMIS_SDK_CHANNEL_SECRET_FILE, 'utf8') : '')).trim();
const CHANNEL_ID = (env.ARTEMIS_SDK_CHANNEL_ID || '').trim();
const TENANT_ID = (env.ARTEMIS_TENANT_ID || '').trim();
const PROJECT_ID = (env.ARTEMIS_PROJECT_ID || '').trim();
const RUNTIME = (env.ARTEMIS_RUNTIME_BASE_URL || 'https://agents.kore.ai').replace(/\/+$/, '');
const ORIGINS = new Set((env.ALLOWED_ORIGINS || 'https://questomni.onrender.com').split(',').map((s) => s.trim()).filter(Boolean));
const PORT = Number(env.PORT || 8787);

for (const [name, value] of Object.entries({ ARTEMIS_SDK_CHANNEL_SECRET: SECRET, ARTEMIS_SDK_CHANNEL_ID: CHANNEL_ID, ARTEMIS_TENANT_ID: TENANT_ID, ARTEMIS_PROJECT_ID: PROJECT_ID })) {
  if (!value) { console.error(`Missing ${name}`); process.exit(1); }
}

// Same shape the page accepts: continuity codes are opaque URL-safe strings.
const CODE_RE = /^[A-Za-z0-9_-]{16,128}$/;

// Small per-IP limit so the endpoint can't be used to mint tokens in bulk.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function send(res, status, body, origin) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', vary: 'Origin' };
  if (origin && ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['access-control-allow-headers'] = 'content-type';
    headers['access-control-max-age'] = '600';
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 4096) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

// Kore (ticket 80334): a continuity invitation belongs to the caller, so verifiedUserId must be the caller's phone in
// +E.164, matching the number that placed the call. Accepts "+<cc><number>", 10-digit US, or 11-digit US starting with 1.
function toE164(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  let e164 = '';
  if (raw.startsWith('+')) e164 = `+${digits}`;
  else if (digits.length === 10) e164 = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith('1')) e164 = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : '';
}

// TEST STAGE: the number is taken as typed (no OTP yet). The one-time link itself only reaches the caller's phone.
// Production should verify the number with a one-time code before minting.
async function mintBootstrapToken(phone) {
  const verifiedUserId = phone;
  const r = await fetch(`${RUNTIME}/api/v1/sdk/customer-sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sdk-channel-secret': SECRET },
    // qd_cont marks a continuity visitor: the agent (v5.7.2+) then keeps this SDK session silent instead of starting
    // its own conversation, because the visitor's typed answers go into the live call.
    body: JSON.stringify({ tenantId: TENANT_ID, projectId: PROJECT_ID, channelId: CHANNEL_ID, verifiedUserId, customAttributes: { qd_cont: '1' } }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || typeof body.bootstrapToken !== 'string') {
    // Log only the status and error code, never the token, secret or invitation code.
    console.error('customer-sessions failed', r.status, body?.error?.code || body?.code || '');
    return null;
  }
  return { bootstrapToken: body.bootstrapToken, expiresIn: body.expiresIn };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const path = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && path === '/healthz') return send(res, 200, { ok: true });
  if (path !== '/api/continuity/bootstrap') return send(res, 404, { error: 'not_found' });
  if (req.method === 'OPTIONS') return send(res, ORIGINS.has(origin) ? 204 : 403, undefined, origin);
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, origin);
  if (!ORIGINS.has(origin)) return send(res, 403, { error: 'origin_not_allowed' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'too_many_requests' }, origin);
  const body = await readJson(req);
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!CODE_RE.test(code)) return send(res, 400, { error: 'invalid_code' }, origin);
  const phone = toE164(body?.phone);
  if (!phone) return send(res, 400, { error: 'invalid_phone' }, origin);
  try {
    const minted = await mintBootstrapToken(phone);
    if (!minted) return send(res, 502, { error: 'bootstrap_unavailable' }, origin);
    return send(res, 200, minted, origin);
  } catch (e) {
    console.error('customer-sessions error', e?.name || 'Error');
    return send(res, 502, { error: 'bootstrap_unavailable' }, origin);
  }
});

server.listen(PORT, () => console.log(`continuity token server on :${PORT}; origins: ${[...ORIGINS].join(', ')}`));
