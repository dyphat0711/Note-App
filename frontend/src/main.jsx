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

/**
 * Service Worker registration.
 *
 * onNeedRefresh  – a new SW version is waiting to activate.  We prompt the
 *                  user so they can reload at a convenient time instead of
 *                  silently swapping assets under them.
 * onOfflineReady – the app shell is now fully cached; the user can go
 *                  offline and still open NoteFlow.
 */
const updateSW = registerSW({
  onNeedRefresh() {
    // Use a native confirm so we don't depend on react-hot-toast being
    // initialised yet (this callback can fire very early).
    if (window.confirm("A new version of NoteFlow is available. Reload now?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info("[NoteFlow] App is ready to work offline.");
  },
});

// Export so App can trigger a manual update check if needed.
export { updateSW };
