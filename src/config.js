// Artemis project and Web SDK channel (OmniWebSDK, hosted exchange) of "Quest Results IVR - Text Link".
export const SDK_CONFIG = {
  endpoint: "https://agents.kore.ai",
  projectId: "01a1ab58-3e51-7b07-a103-84ebb7bc80a1",
  channelId: "01a1abed-037d-78e4-8ea0-4174cf59ef2a",
  // Public key (starts with pk_abbf7afb) from .env, built into docs/. Public by design and origin-restricted.
  apiKey: import.meta.env.VITE_AGENT_PUBLIC_API_KEY,
};

export const QUEST_THEME = {
  assistantName: "Quest Diagnostics",
  primaryColor: "#0b6e4f",
  primaryHoverColor: "#095c42",
  headerBackgroundColor: "#0b6e4f",
  headerTextColor: "#ffffff",
  backgroundColor: "#ffffff",
  surfaceColor: "#f6f9f8",
  textColor: "#1d2327",
  textMutedColor: "#5b6770",
  borderColor: "#d5dde2",
  userBubbleColor: "#0b6e4f",
  userBubbleTextColor: "#ffffff",
  assistantBubbleColor: "#e7f4ee",
  assistantBubbleTextColor: "#1d2327",
  borderRadius: 14,
  baseFontSize: 15,
};

// The voice bot texts links like  .../QuestOmni/#f=account&bt=<single-use verified token>.
// Read them once and remove them from the address bar and history right away.
export function readTextedLink() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = hash.get("bt") || "";
  const fields = hash.get("f") === "patient" ? "patient" : "account";
  if (window.location.hash) {
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ignore */ }
  }
  return { token, fields };
}
