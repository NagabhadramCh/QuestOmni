import { useState } from "react";
import { AgentProvider } from "@koreai/artemis-web-sdk/react";
import { QUEST_THEME, SDK_CONFIG, readTextedLink } from "./config.js";
import ChatWindow from "./components/ChatWindow.jsx";
import AvatarBubble from "./components/AvatarBubble.jsx";

// Read once at load: the texted link's token is single-use.
const LINK = readTextedLink();

export default function App() {
  return LINK.token ? <LinkedChat token={LINK.token} fields={LINK.fields} /> : <SiteChat />;
}

// Opened from the link the Quest voice bot texted during a call: a verified Web SDK session (hosted exchange, the
// caller's number) that the Quest agent uses to collect one value for that call.
function LinkedChat({ token, fields }) {
  const what = fields === "patient" ? "the patient's name and date of birth" : "your Quest account number";
  return (
    <main className="page page--linked">
      <header className="intro">
        <p className="eyebrow">Quest Diagnostics · Test results line</p>
        <h1>Secure chat for your call</h1>
        <p>Type {what} in the chat below. Then go back to your call and say <strong>done</strong>.</p>
      </header>
      <AgentProvider
        endpoint={SDK_CONFIG.endpoint}
        projectId={SDK_CONFIG.projectId}
        bootstrapToken={token}
        theme={QUEST_THEME}
      >
        <ChatWindow title="Quest secure chat" variant="inline" expiredText="This link has expired or was already used. Please ask for a new one on your call." />
      </AgentProvider>
      <p className="foot">This link works once, for 5 minutes after it was sent. Please don't share it.</p>
    </main>
  );
}

// A plain visit: the normal Quest chat bubble on the OmniWebSDK channel (public key).
function SiteChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const hasApiKey = Boolean(SDK_CONFIG.apiKey);

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Quest Diagnostics</p>
        <h1>Test results line</h1>
        <p>Chat with the Quest test results assistant. On a call, ask for a text link to type your details instead.</p>
        {!hasApiKey && (
          <div className="warning">
            Add <code>VITE_AGENT_PUBLIC_API_KEY</code> to <code>.env.local</code> (local) or as a repository secret (GitHub Pages).
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
