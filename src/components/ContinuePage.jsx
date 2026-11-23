import { useEffect, useRef, useState } from "react";
import { AgentWidget } from "@koreai/artemis-web-sdk";
import { CONTINUITY_CONFIG, QUEST_THEME } from "../config.js";

// Opens an Artemis continuity link (…/?invitation=<id>&code=<code>) sent by the OmniWhatsapp voice agent through
// offer_continuity, and joins the live call so the caller can type answers while the call stays up.
//
// Artemis only lets the caller themself open the invitation (Kore ticket 80334): the visitor must be signed in through
// the hosted_exchange channel with verifiedUserId = the caller's phone in +E.164. So the page first asks for the number
// the caller is calling from; our token server turns it into a single-use bootstrap token.
// TEST STAGE: the number is not yet verified with a one-time code.
// The SDK widget is a floating launcher panel (fixed 380x580 box, open/close buttons). On this page the chat is the
// whole point, so it is laid out inside the page box: the host element is made static by styles.css
// (.continue-host > agent-widget), and this style, added to the widget's open shadow root, fills the box and hides the
// launcher and the close/minimise/maximise/resize controls. Re-added if the widget re-renders its shadow root.
const INLINE_CHAT_CSS = `
.panel-launcher, .launcher, .maximize-btn, .minimize-btn, .close-btn, .resize-handle, .resize-hit-area { display: none !important; }
.widget-container, .widget-container.maximized, .widget-container.with-panel-launcher {
  width: 100% !important; height: 100% !important; max-height: none !important; margin: 0 !important;
  border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
}`;

function keepInline(widget) {
  const root = widget.shadowRoot;
  if (!root) return () => {};
  const ensure = () => {
    if (root.querySelector("style[data-quest-inline]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-quest-inline", "");
    style.textContent = INLINE_CHAT_CSS;
    root.appendChild(style);
  };
  ensure();
  const observer = new MutationObserver(ensure);
  observer.observe(root, { childList: true });
  return () => observer.disconnect();
}

// Web SDK 1.1.3: once joined to the live call, the widget sends typed text into the call (a "typed_interrupt" to the
// live session) only while its own voice is active; with voice off it sends a normal chat message to the widget's own
// SDK session, which starts a separate conversation the call never sees (sessions sdk_51ac2080 / sdk_ae324d7f).
// On this page every typed answer belongs to the call, so while joined the send button and Enter use the live path.
// Verified on a real call 2026-11-23 13:17 UTC: "hold on" typed here got "Of course, take your time." from the call.
function sendTypedIntoLiveCall(widget) {
  if (typeof widget.sendTypedInterrupt !== "function" || typeof widget.sendMessage !== "function") return;
  widget.handleSendAction = function handleSendAction() {
    return this.isInLiveSession ? this.sendTypedInterrupt() : this.sendMessage();
  };
}

export default function ContinuePage({ code }) {
  const host = useRef(null);
  const { tokenUrl, apiKey, channelId } = CONTINUITY_CONFIG;
  const needsPhone = Boolean(tokenUrl);
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(
    needsPhone
      ? { kind: "note", text: "Enter the phone number you're calling from to open this chat." }
      : { kind: "note", text: "Connecting you to your call…" },
  );

  useEffect(() => {
    if (!host.current) return undefined;
    if (!tokenUrl && !apiKey) {
      setStatus({ kind: "error", text: "This page isn't set up yet. Please continue on your call." });
      return undefined;
    }
    if (needsPhone && !phone) return undefined;
    setStatus({ kind: "note", text: "Connecting you to your call…" });
    // Caller identity: our token server mints a single-use hosted_exchange bootstrap token for this phone number.
    const getBootstrapToken = async () => {
      const r = await fetch(tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.status === 400 && body.error === "invalid_phone") throw new Error("Please check the phone number");
      if (!r.ok || typeof body.bootstrapToken !== "string") throw new Error("We couldn't verify this link");
      return body.bootstrapToken;
    };
    const auth = needsPhone ? { bootstrapTokenProvider: getBootstrapToken } : { channelId, apiKey };
    const widget = AgentWidget.init(
      {
        endpoint: CONTINUITY_CONFIG.endpoint,
        projectId: CONTINUITY_CONFIG.projectId,
        ...auth,
        mode: "chat",
        chatEnabled: true,
        voiceEnabled: false,
        placeholder: "Type your answer…",
        theme: QUEST_THEME,
        continuityInvitationCode: code,
        continuityInvitationSurface: "web",
      },
      { target: host.current, replace: true },
    );
    const onJoined = () => setStatus({ kind: "ok", text: "You're connected to your call. Type your answers below." });
    const onError = (e) => {
      const msg = e?.detail?.message || "";
      setStatus({
        kind: "error",
        text: `We couldn't open this link${msg ? ` (${msg})` : ""}. Use the number you're calling from; the link works once, only during your call.`,
      });
    };
    widget.addEventListener("continuity-exchange", onJoined);
    widget.addEventListener("continuity-error", onError);
    if (typeof widget.open === "function") widget.open();
    const stopInline = keepInline(widget);
    sendTypedIntoLiveCall(widget);
    return () => {
      stopInline();
      widget.removeEventListener("continuity-exchange", onJoined);
      widget.removeEventListener("continuity-error", onError);
      AgentWidget.destroy(widget);
    };
  }, [code, phone]);

  const onSubmit = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (value.replace(/\D/g, "").length < 8) {
      setStatus({ kind: "error", text: "Please enter the full phone number you're calling from." });
      return;
    }
    setPhone(value);
  };

  return (
    <main className="page wrap">
      <div className="intro">
        <p className="eyebrow">Test results</p>
        <h1>Continue your call</h1>
        <p className="lead">This chat is connected to the call you're on. Type your answers here, or keep talking on the phone.</p>
      </div>
      <p className={status.kind === "error" ? "warning" : "note"} role="status">{status.text}</p>
      {needsPhone && !phone && (
        <form className="phone-form" onSubmit={onSubmit}>
          <label htmlFor="caller-phone">Phone number you're calling from</label>
          <div className="phone-form__row">
            <input
              id="caller-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
            />
            <button type="submit">Continue</button>
          </div>
          <p className="phone-form__hint">US numbers can be typed without +1. Other countries: start with + and the country code.</p>
        </form>
      )}
      <section className="continue-host" ref={host} aria-label="Quest Diagnostics secure chat" hidden={needsPhone && !phone} />
      <p className="note">This link works once and only for your current call. Please don't share it.</p>
    </main>
  );
}
