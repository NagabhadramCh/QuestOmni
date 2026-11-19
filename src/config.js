// Artemis project and Web SDK channel (OmniWebSDK, hosted exchange) of "Quest Results IVR - Text Link".
export const SDK_CONFIG = {
  endpoint: "https://agents.kore.ai",
  projectId: "01a1ab58-3e51-7b07-a103-84ebb7bc80a1",
  channelId: "01a1abed-037d-78e4-8ea0-4174cf59ef2a",
  // Public key (starts with pk_abbf7afb) from .env, built into docs/. Public by design and origin-restricted.
  apiKey: import.meta.env.VITE_AGENT_PUBLIC_API_KEY,
};

// Quest Diagnostics palette (Provider Services): deep green, lime accent, warm grey-green surfaces.
// OmniWhatsapp continuity page (?invitation=&code=). Artemis needs a verified visitor to join a live call, so the page
// gets a single-use bootstrap token for the hosted_exchange channel OmniContinuityHosted from our token server
// (server/token-server.mjs, VITE_CONTINUITY_TOKEN_URL). The anonymous public key is only a fallback when no token URL is set.
export const CONTINUITY_CONFIG = {
  endpoint: "https://agents.kore.ai",
  projectId: "01a1c0af-7353-7aab-b32f-8a8f746a8d73",
  tokenUrl: import.meta.env.VITE_CONTINUITY_TOKEN_URL,
  channelId: import.meta.env.VITE_CONTINUITY_CHANNEL_ID,
  apiKey: import.meta.env.VITE_CONTINUITY_PUBLIC_API_KEY,
};

// Artemis continuity link (offer_continuity): ?invitation=<id>&code=<one-time code>.
export function readContinuityLink() {
  const q = new URLSearchParams(window.location.search);
  const code = (q.get("code") || "").trim();
  return q.get("invitation") && /^[A-Za-z0-9_-]{16,128}$/.test(code) ? code : "";
}

export const QUEST_THEME = {
  assistantName: "Quest Diagnostics",
  primaryColor: "#4A7637",
  primaryHoverColor: "#3B6A2C",
  primaryForegroundColor: "#FFFFFF",
  headerBackgroundColor: "#4A7637",
  headerTextColor: "#FFFFFF",
  backgroundColor: "#FFFFFF",
  surfaceColor: "#F6F8F3",
  textColor: "#1B2418",
  textMutedColor: "#586253",
  borderColor: "#D8DED3",
  userBubbleColor: "#4A7637",
  userBubbleTextColor: "#FFFFFF",
  assistantBubbleColor: "#EEF3DC",
  assistantBubbleTextColor: "#1B2418",
  composeBarBackgroundColor: "#FFFFFF",
  composeBarTextColor: "#1B2418",
  composeBarPlaceholderColor: "#8A9285",
  launcherBackgroundColor: "#4A7637",
  launcherIconColor: "#FFFFFF",
  fontFamily: '"Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif',
  borderRadius: 12,
  baseFontSize: 15,
};

// Link store the voice bot writes to (mock stand-in for Quest's own link service).
export const LINK_STORE = "https://6aca73ee3115bcc95820d8c6.mockapi.io/deliveries";

// The voice bot texts a short link  .../QuestOmni/?c=<record>.<one-time key>  (v5.3.1). Older links carried the token
// itself in the fragment (#f=patient&bt=<token>); both are read once and removed from the address bar right away.
export function readTextedLink() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const token = hash.get("bt") || "";
  // The code arrives as ?c=... (older links) or in the path, /s=0&c=... (current links: US carriers filter the "?" form).
  let path = "";
  try { path = decodeURIComponent(window.location.pathname); } catch { path = window.location.pathname; }
  const inPath = path.match(/(?:^|[/&])c=(\d{1,9}\.[0-9a-z]{8,40})(?:$|[&/])/i);
  const rawCode = query.get("c") || hash.get("c") || (inPath ? inPath[1] : "");
  const code = /^\d{1,9}\.[0-9a-z]{8,40}$/i.test(rawCode) ? rawCode : "";
  if (window.location.hash || window.location.search || inPath) {
    const cleanPath = inPath ? import.meta.env.BASE_URL : window.location.pathname;
    try { window.history.replaceState(null, "", cleanPath); } catch { /* ignore */ }
  }
  return { token, code };
}

// Short code -> the single-use bootstrap token saved on the link record. The token is only returned while the record
// is open (sent/pending, not expired) and the one-time key matches; it is retried briefly in case the SMS beat the save.
export async function resolveLinkCode(code) {
  const [ref, key] = code.split(".");
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${LINK_STORE}/${encodeURIComponent(ref)}`, { cache: "no-store" });
      if (res.ok) {
        const rec = await res.json();
        const open = (rec.status === "sent" || rec.status === "pending") && (!rec.expiresAt || Date.now() < Date.parse(rec.expiresAt));
        if (rec.kind === "text_link" && rec.token === key && open && rec.bt) return rec.bt;
        if (rec.kind === "text_link" && rec.token === key && !open) return "";
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return "";
}
