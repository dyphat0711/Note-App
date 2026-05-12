import { useEffect, useState, useCallback, useRef } from "react";
import offlineStore from "../lib/offlineStore";
import { noteAPI, labelAPI } from "../api/services";
import useNoteStore from "../store/useNoteStore";

/**
 * Determines whether an error is a network / connectivity failure as opposed
 * to a server-side error (4xx / 5xx).  We only keep mutations in the queue
 * for network failures; server errors are dropped after logging.
 */
function isNetworkError(err) {
  // Axios sets err.code === 'ERR_NETWORK' and err.response === undefined when
  // there is no connectivity.  A request that was aborted by the browser while
  // offline also surfaces as a network error.
  return !err.response && (err.code === "ERR_NETWORK" || err.message === "Network Error" || !navigator.onLine);
}

/**
 * Wires up online/offline detection, snapshots store state to IndexedDB on
 * every change, and replays queued mutations when the network is back.
 *
 * Features
 * ─────────
 * • Watches both `window online/offline` events AND a periodic connectivity
 *   probe so the UI reflects actual reachability, not just the browser flag.
 * • Exponential back-off retry (max 5 attempts) for the flush pass.
 * • Queue deduplication – consecutive note.update for the same note id are
 *   collapsed by offlineStore.enqueueNoteUpdate.
 * • All mutation types handled: note.create, note.update, note.delete,
 *   note.togglePin, label.create, label.update, label.delete.
 * • Snapshots notes + labels to IndexedDB on every Zustand change so a cold
 *   offline reload still shows data.
 *
 * Conflict policy: last-write-wins by client `updatedAt`. Server response
 * replaces local copy after a successful replay.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Ref guards against concurrent flush runs.
  const flushingRef = useRef(false);
  // Tracks how many times we've retried the current flush pass.
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 3000;

  const refreshPendingCount = useCallback(async () => {
    try {
      const list = await offlineStore.listPending();
      setPendingCount(list.length);
    } catch {
      /* IndexedDB not available */
    }
  }, []);

  /**
   * Replay all queued mutations against the server in FIFO order.
   * On the first network failure during replay we stop and schedule a retry
   * with exponential back-off.  Server errors (4xx/5xx) for a specific item
   * are dropped after logging so they don't permanently block the queue.
   */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    if (!navigator.onLine) return;

    flushingRef.current = true;
    setSyncing(true);

    try {
      const items = await offlineStore.listPending();

      for (const item of items) {
        try {
          if (item.type === "note.update" && item.payload?.id) {
            await noteAPI.update(item.payload.id, item.payload.body);

          } else if (item.type === "note.create") {
            const { data } = await noteAPI.create(item.payload.body);
            // Map the temp local id to the real server id.
            if (item.payload?.tempId && data?.data?.id) {
              useNoteStore.setState((s) => ({
                notes: s.notes.map((n) =>
                  n.id === item.payload.tempId ? { ...n, id: data.data.id } : n,
                ),
              }));
            }

          } else if (item.type === "note.delete" && item.payload?.id) {
            await noteAPI.delete(item.payload.id);

          } else if (item.type === "note.togglePin" && item.payload?.id) {
            await noteAPI.togglePin(item.payload.id);

          } else if (item.type === "label.create") {
            const { data } = await labelAPI.create(item.payload.body);
            // Replace the temp label id in store with the real server id.
            if (item.payload?.tempId && data?.data?.id) {
              useNoteStore.setState((s) => ({
                labels: s.labels.map((l) =>
                  l.id === item.payload.tempId ? { ...l, id: data.data.id } : l,
                ),
              }));
            }

          } else if (item.type === "label.update" && item.payload?.id) {
            await labelAPI.update(item.payload.id, item.payload.body);

          } else if (item.type === "label.delete" && item.payload?.id) {
            await labelAPI.delete(item.payload.id);
          }

          // Success — remove from queue.
          await offlineStore.dropPending(item.id);
          retryCountRef.current = 0; // reset back-off on any success

        } catch (err) {
          if (isNetworkError(err)) {
            // Stop replay; schedule a retry with back-off.
            const delay = Math.min(
              BASE_DELAY_MS * Math.pow(2, retryCountRef.current),
              60_000,
            );
            retryCountRef.current = Math.min(retryCountRef.current + 1, MAX_RETRIES);
            if (retryCountRef.current < MAX_RETRIES) {
              setTimeout(() => {
                flushingRef.current = false;
                flushQueue();
              }, delay);
            } else {
              retryCountRef.current = 0;
            }
            return; // exit the loop; finally block still runs
          } else {
            // 4xx / 5xx — log and drop so the queue doesn't jam.
            console.warn("[OfflineSync] Dropping mutation due to server error:", item, err);
            await offlineStore.dropPending(item.id);
          }
        }
      }

      // Full replay succeeded — pull fresh state from server.
      await useNoteStore.getState().fetchAll();
      setLastSyncTime(new Date());

    } finally {
      flushingRef.current = false;
      setSyncing(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // ── Online / Offline event listeners ─────────────────────────────────────
  useEffect(() => {
    const onlineHandler = () => {
      setIsOnline(true);
      retryCountRef.current = 0; // reset back-off when network comes back
      flushQueue();
    };
    const offlineHandler = () => setIsOnline(false);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    // Initial pending count.
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [flushQueue, refreshPendingCount]);

  // ── Periodic connectivity probe ───────────────────────────────────────────
  // The browser's `navigator.onLine` / online event can be unreliable in some
  // environments (e.g. a connected but captive-portal network).  We ping the
  // server health endpoint every 30 s to get a ground-truth reading.
  // Use a ref so the probe doesn't recreate the interval on every isOnline change.
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  useEffect(() => {
    const probe = async () => {
      try {
        const res = await fetch("/api/ping", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok && !isOnlineRef.current) {
          setIsOnline(true);
          flushQueue();
        }
      } catch {
        if (isOnlineRef.current) setIsOnline(false);
      }
    };

    const id = setInterval(probe, 30_000);
    return () => clearInterval(id);
  }, [flushQueue]);

  // ── Snapshot store → IndexedDB on every change ────────────────────────────
  useEffect(() => {
    const unsubscribe = useNoteStore.subscribe((state, prev) => {
      if (state.notes !== prev.notes) {
        offlineStore.putNotes(state.notes).catch(() => {});
      }
      if (state.labels !== prev.labels) {
        offlineStore.putLabels(state.labels).catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  // ── Offline cold-start hydration ──────────────────────────────────────────
  /**
   * Hydrate Zustand from the IndexedDB cache.  Called by Dashboard when the
   * initial fetchAll() fails (network error).
   */
  const hydrateFromCache = useCallback(async () => {
    try {
      const [notes, labels] = await Promise.all([
        offlineStore.getNotes(),
        offlineStore.getLabels(),
      ]);
      if (notes.length || labels.length) {
        useNoteStore.setState({ notes, labels });
      }
    } catch {
      /* IndexedDB unavailable */
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncTime,
    flushQueue,
    hydrateFromCache,
    refreshPendingCount,
  };
}
