import { useEffect, useState, useCallback, useRef } from "react";
import offlineStore from "../lib/offlineStore";
import { noteAPI, labelAPI } from "../api/services";
import useNoteStore from "../store/useNoteStore";

/**
 * Wires up online/offline detection, snapshots store state to IndexedDB on every change,
 * and replays queued mutations when the network is back.
 *
 * Conflict policy: last-write-wins by client `updatedAt`. Server response replaces local
 * copy after a successful replay.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const list = await offlineStore.listPending();
    setPendingCount(list.length);
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
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
            // Map temp local id to real server id
            if (item.payload?.tempId && data?.data?.id) {
              const note = useNoteStore.getState().notes.find(
                (n) => n.id === item.payload.tempId,
              );
              if (note) {
                useNoteStore.setState((s) => ({
                  notes: s.notes.map((n) =>
                    n.id === item.payload.tempId
                      ? { ...n, id: data.data.id }
                      : n,
                  ),
                }));
              }
            }
          } else if (item.type === "note.delete" && item.payload?.id) {
            await noteAPI.delete(item.payload.id);
          } else if (item.type === "note.togglePin" && item.payload?.id) {
            await noteAPI.togglePin(item.payload.id);
          } else if (item.type === "label.create") {
            await labelAPI.create(item.payload.body);
          } else if (item.type === "label.update" && item.payload?.id) {
            await labelAPI.update(item.payload.id, item.payload.body);
          } else if (item.type === "label.delete" && item.payload?.id) {
            await labelAPI.delete(item.payload.id);
          }
          await offlineStore.dropPending(item.id);
        } catch {
          // Stop on first failure to preserve order; user will retry next time.
          break;
        }
      }
      // Final pull from server to reconcile state.
      await useNoteStore.getState().fetchAll();
    } finally {
      flushingRef.current = false;
      setSyncing(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const onlineHandler = () => {
      setIsOnline(true);
      flushQueue();
    };
    const offlineHandler = () => setIsOnline(false);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [flushQueue, refreshPendingCount]);

  // Snapshot store state to IndexedDB whenever notes/labels change so reloads while
  // offline still show data.
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

  // Bootstrap from cache if API fails (offline cold start).
  const hydrateFromCache = useCallback(async () => {
    const [notes, labels] = await Promise.all([
      offlineStore.getNotes(),
      offlineStore.getLabels(),
    ]);
    if (notes.length || labels.length) {
      useNoteStore.setState({ notes, labels });
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    syncing,
    flushQueue,
    hydrateFromCache,
    refreshPendingCount,
  };
}

/**
 * Helper to enqueue a mutation while offline, with optimistic local update.
 */
export async function enqueueMutation(type, payload) {
  await offlineStore.enqueue({ type, payload });
}
