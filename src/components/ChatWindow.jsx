import { ChatWidget, useAgent } from "@koreai/artemis-web-sdk/react";

export default function ChatWindow({ title, variant, onClose, expiredText }) {
  const { isConnected, error } = useAgent();
  const status = error
    ? (expiredText || "We couldn't start the chat. Please try again.")
    : isConnected ? "Connected securely" : "Connecting…";

  return (
    <section className={`chat-window chat-window--${variant}`} aria-label={title}>
      <header className="chat-header">
        <span className="chat-header__title">
          <span className="chat-header__dot" aria-hidden="true" />
          {title}
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat">×</button>
        )}
      </header>
      <div className="chat-body">
        <p className={error ? "sdk-status error" : "sdk-status"} role="status">{status}</p>
        {!error && <ChatWidget enableFeedback={false} />}
      </div>
    </section>
  );
}
