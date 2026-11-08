// Artemis project and Web SDK channel (OmniWebSDK, hosted exchange) of "Quest Results IVR - Text Link".
export const SDK_CONFIG = {
  endpoint: "https://agents.kore.ai",
  projectId: "01a1ab58-3e51-7b07-a103-84ebb7bc80a1",
  channelId: "01a1abed-037d-78e4-8ea0-4174cf59ef2a",
  // Public key (starts with pk_abbf7afb) from .env, built into docs/. Public by design and origin-restricted.
  apiKey: import.meta.env.VITE_AGENT_PUBLIC_API_KEY,
};

// Quest Diagnostics palette (Provider Services): deep green, lime accent, warm grey-green surfaces.
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
