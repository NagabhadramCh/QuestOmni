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
    return () => {
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
