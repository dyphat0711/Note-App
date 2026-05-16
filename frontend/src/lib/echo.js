let echoInstance = null;
let echoModulesLoaded = false;

/**
 * Dynamically import Echo + Pusher only when first needed (saves ~40 KB from
 * the initial bundle for users who don't have shared notes).
 */
async function loadEchoModules() {
  if (echoModulesLoaded) return;
  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import("laravel-echo"),
    import("pusher-js"),
  ]);
  window.Pusher = Pusher;
  window._EchoClass = Echo;
  echoModulesLoaded = true;
}

/**
 * Lazy-init a Laravel Echo client backed by the Pusher protocol that Reverb implements.
 * The auth token from localStorage is forwarded to /broadcasting/auth so private and
 * presence channels can authenticate against the Sanctum-protected route.
 *
 * Returns null synchronously if the modules haven't been loaded yet. Call
 * `ensureEcho()` (async) in effects to guarantee readiness.
 */
export function getEcho() {
  if (echoInstance) return echoInstance;
  if (!echoModulesLoaded || typeof window === "undefined") return null;

  const key = import.meta.env.VITE_REVERB_APP_KEY || "noteflow_key";

  const EchoClass = window._EchoClass;
  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
  const port =
    Number(import.meta.env.VITE_REVERB_PORT) ||
    (import.meta.env.VITE_REVERB_SCHEME === "https" ? 443 : 8080);
  const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";

  const baseUrl =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.host}/api`;

  const broadcastingAuthEndpoint = `${baseUrl.replace(/\/api\/?$/, "")}/broadcasting/auth`;

  echoInstance = new EchoClass({
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

/**
 * Async version — loads modules on demand, then returns the Echo instance.
 * Safe to call multiple times.
 */
export async function ensureEcho() {
  await loadEchoModules();
  return getEcho();
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
