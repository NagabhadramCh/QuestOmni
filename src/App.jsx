import { useState } from "react";
import { AgentProvider } from "@koreai/artemis-web-sdk/react";
import { QUEST_THEME, SDK_CONFIG, readTextedLink } from "./config.js";
import ChatWindow from "./components/ChatWindow.jsx";
import AvatarBubble from "./components/AvatarBubble.jsx";

// Read once at load: the texted link's token is single-use.
const LINK = readTextedLink();
const LOGO = `${import.meta.env.BASE_URL}quest-logo.png`;

export default function App() {
  return (
    <div className="shell">
      <div className="brandbar" aria-hidden="true" />
      <SiteHeader />
      {LINK.token ? <LinkedChat token={LINK.token} /> : <SiteChat />}
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap site-header__row">
        <img className="logo" src={LOGO} alt="Quest Diagnostics" width="125" height="44" />
        <span className="sep" aria-hidden="true" />
        <span className="area">Provider Services</span>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__row">
        <span>Quest Diagnostics · <b>Provider Services</b></span>
        <span>Secure form · Powered by Pronix.ai</span>
      </div>
    </footer>
  );
}

// Opened from the link the Quest voice agent texted during a call: a verified Web SDK session (hosted exchange,
// the caller's number). The Quest agent shows the patient forms inside the chat and keeps the result for that call.
function LinkedChat({ token }) {
  return (
    <main className="wrap page">
      <section className="intro">
        <p className="eyebrow">Test results</p>
        <h1>Secure patient form</h1>
        <ol className="steps">
          <li><span className="num">1</span><span>Enter the patient's name and date of birth.</span></li>
          <li><span className="num">2</span><span>Add any two details to verify the patient.</span></li>
          <li><span className="num">3</span><span>Go back to your call and say <strong>done</strong>.</span></li>
        </ol>
      </section>
      <AgentProvider
        endpoint={SDK_CONFIG.endpoint}
        projectId={SDK_CONFIG.projectId}
        bootstrapToken={token}
        theme={QUEST_THEME}
      >
        <ChatWindow
          title="Quest Diagnostics · Secure chat"
          variant="inline"
          expiredText="This link has expired or was already used. Please ask for a new one on your call."
        />
      </AgentProvider>
      <p className="note">
        <LockIcon /> This link works once and only for your current call. Please don't share it.
      </p>
    </main>
  );
}

// A plain visit: the Quest test results assistant in a chat bubble (OmniWebSDK channel, public key).
function SiteChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const hasApiKey = Boolean(SDK_CONFIG.apiKey);

  return (
    <main className="wrap page">
      <section className="intro">
        <p className="eyebrow">Test results</p>
        <h1>Test Results Assistant</h1>
        <p className="lead">
          For ordering and treating physicians' offices. Chat with the Quest test results assistant, or call and ask for
          a secure form to type the patient's details instead of saying them.
        </p>
        {!hasApiKey && (
          <div className="warning">
            Add <code>VITE_AGENT_PUBLIC_API_KEY</code> to <code>.env</code> and rebuild.
          </div>
        )}
      </section>

      {!isOpen && <AvatarBubble onClick={() => { setInstanceKey((v) => v + 1); setIsOpen(true); }} />}

      {isOpen && hasApiKey && (
        <AgentProvider
          key={instanceKey}
          endpoint={SDK_CONFIG.endpoint}
          projectId={SDK_CONFIG.projectId}
          apiKey={SDK_CONFIG.apiKey}
          channelId={SDK_CONFIG.channelId}
          clientSessionIdentifier={false}
          theme={QUEST_THEME}
        >
          <ChatWindow title="Quest Diagnostics" variant="floating" onClose={() => setIsOpen(false)} />
        </AgentProvider>
      )}
    </main>
  );
}

function LockIcon() {
  return (
    <svg className="lock" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z" fill="currentColor" />
    </svg>
  );
}
