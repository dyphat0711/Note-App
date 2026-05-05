import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

/**
 * Lazy-init a Laravel Echo client backed by the Pusher protocol that Reverb implements.
 * The auth token from localStorage is forwarded to /broadcasting/auth so private and
 * presence channels can authenticate against the Sanctum-protected route.
 */
export function getEcho() {
  if (echoInstance) return echoInstance;

  if (typeof window === "undefined") return null;

  window.Pusher = Pusher;

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key) {
    return null; // Real-time disabled (no env config)
  }

  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
  const port =
    Number(import.meta.env.VITE_REVERB_PORT) ||
    (import.meta.env.VITE_REVERB_SCHEME === "https" ? 443 : 8080);
  const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";

  const baseUrl =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.host}/api`;

  const broadcastingAuthEndpoint = `${baseUrl.replace(/\/api\/?$/, "")}/broadcasting/auth`;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: scheme === "https" ? ["wss"] : ["ws", "wss"],
    authEndpoint: broadcastingAuthEndpoint,
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        Accept: "application/json",
      },
    },
  });

  return echoInstance;
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      /* ignore */
    }
    echoInstance = null;
  }
}

/**
 * Subscribe to a note's private channel for collaborative edits.
 * Returns the channel so the caller can attach `.listen` callbacks.
 */
export function joinNoteChannel(noteId) {
  const echo = getEcho();
  if (!echo) return null;
  return echo.private(`note.${noteId}`);
}

/**
 * Subscribe to a note's presence channel for "who is editing" indicators.
 */
export function joinNotePresence(noteId) {
  const echo = getEcho();
  if (!echo) return null;
  return echo.join(`note.${noteId}`);
}

export function leaveNote(noteId) {
  const echo = getEcho();
  if (!echo) return;
  try {
    echo.leave(`note.${noteId}`);
  } catch {
    /* ignore */
  }
}
