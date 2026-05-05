import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for offline + auto-update.
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-update silently in production; the user reload will pick up new version.
  },
  onOfflineReady() {
    // App is now usable offline.
  },
});

// Export so the App can call `updateSW()` if a future "update available" prompt is wanted.
export { updateSW };
