import { useEffect, useRef, useState } from "react";
import { AgentWidget } from "@koreai/artemis-web-sdk";
import { CONTINUITY_CONFIG, QUEST_THEME } from "../config.js";

// Opens an Artemis continuity link (…/?invitation=<id>&code=<code>) sent by the OmniWhatsapp voice agent through
// offer_continuity. The SDK widget connects with the OmniWhatsapp public key, exchanges the one-time code and joins the
// live call, so the caller can read the conversation and type answers into it while the call stays up.
export default function ContinuePage({ code }) {
  const host = useRef(null);
  const [status, setStatus] = useState({ kind: "connecting", text: "Connecting you to your call…" });

  useEffect(() => {
    if (!host.current) return undefined;
    const { tokenUrl, apiKey, channelId } = CONTINUITY_CONFIG;
    if (!tokenUrl && !apiKey) {
      setStatus({ kind: "error", text: "This page isn't set up yet. Please continue on your call." });
      return undefined;
    }
    // Verified visitor: our token server mints a single-use hosted_exchange bootstrap token for this invitation.
    const getBootstrapToken = async () => {
      const r = await fetch(tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || typeof body.bootstrapToken !== "string") throw new Error("We couldn't verify this link");
      return body.bootstrapToken;
    };
    const auth = tokenUrl ? { bootstrapTokenProvider: getBootstrapToken } : { channelId, apiKey };
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
      setStatus({ kind: "error", text: `We couldn't open this link${msg ? ` (${msg})` : ""}. It works once and expires quickly; please ask for a new link on your call.` });
    };
    widget.addEventListener("continuity-exchange", onJoined);
    widget.addEventListener("continuity-error", onError);
    if (typeof widget.open === "function") widget.open();
    return () => {
      widget.removeEventListener("continuity-exchange", onJoined);
      widget.removeEventListener("continuity-error", onError);
      AgentWidget.destroy(widget);
    };
  }, [code]);

  return (
    <main className="page wrap">
      <div className="intro">
        <p className="eyebrow">Test results</p>
        <h1>Continue your call</h1>
        <p className="lead">This chat is connected to the call you're on. Type your answers here, or keep talking on the phone.</p>
      </div>
      <p className={status.kind === "error" ? "warning" : "note"} role="status">{status.text}</p>
      <section className="continue-host" ref={host} aria-label="Quest Diagnostics secure chat" />
      <p className="note">This link works once and only for your current call. Please don't share it.</p>
    </main>
  );
}
