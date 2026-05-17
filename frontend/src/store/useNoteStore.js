import { create } from "zustand";
import {
  noteAPI,
  labelAPI,
  sharingAPI,
  attachmentAPI,
} from "../api/services";
import useAuthStore from "./useAuthStore";
import offlineStore from "../lib/offlineStore";

const DEFAULT_NOTE_COLOR = "#fef3c7";
const NOTE_COLOR_PRESETS = ["#fef3c7", "#fee2e2", "#dbeafe", "#dcfce7", "#fae8ff", "#fff7ed", "#f1f5f9"];

/**
 * Enqueue a mutation to the IndexedDB pending queue.
 * Note.update mutations are deduplicated (merged) by note id.
 */
async function enqueueMutation(type, payload) {
  if (type === "note.update" && payload?.id) {
    return offlineStore.enqueueNoteUpdate(payload.id, payload.body);
  }
  return offlineStore.enqueue({ type, payload });
}


function transformLabel(l) {
  return {
    id: l.id,
    name: l.name,
    color: l.color || "#3b82f6",
    notesCount: l.notes_count ?? 0,
  };
}

function transformShare(s) {
  return {
    id: s.id,
    noteId: s.note_id,
    ownerId: s.owner_id,
    email: s.shared_with_email,
    displayName: s.display_name || null,
    avatarPath: s.avatar_path || null,
    permission: s.permission,
    sharedAt: s.shared_at || s.created_at,
  };
}

function transformAttachment(a) {
  return {
    id: a.id,
    noteId: a.note_id,
    name: a.original_name,
    url: a.url,
    downloadUrl: a.download_url,
    mime: a.mime_type,
    size: a.size,
    exists: a.exists ?? Boolean(a.url),
  };
}

function transformOwner(o) {
  if (!o) return null;
  return {
    id: o.id,
    displayName: o.display_name ?? o.displayName ?? null,
    display_name: o.display_name ?? o.displayName ?? null,
    email: o.email ?? null,
    avatarPath: o.avatar_path ?? o.avatarPath ?? null,
    avatar_path: o.avatar_path ?? o.avatarPath ?? null,
  };
}

function extractArray(val) {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  return [];
}

export function transformNote(n) {
  if (!n) return null;
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title || "Untitled",
    content: n.content === null ? null : (n.content || ""),
    color: n.color || null,
    isPinned: Boolean(n.is_pinned),
    pinnedAt: n.pinned_at || null,
    hasPassword: Boolean(n.has_password),
    isShared: Boolean(n.is_shared),
    isOwner: n.is_owner ?? true,
    sharePermission: n.share_permission ?? null,
    sharedAt: n.shared_at || null,
    owner: transformOwner(n.owner),
    labels: extractArray(n.labels).map(transformLabel),
    shares: extractArray(n.shares).map(transformShare),
    attachments: extractArray(n.attachments).map(transformAttachment),
    createdAt: n.created_at || null,
    updatedAt: n.updated_at || null,
  };
}

const getInitialViewMode = () => {
  try {
    const v = localStorage.getItem("noteflow.viewMode");
    if (v === "grid" || v === "list") return v;
  } catch {
    /* ignore */
  }
  // Spec section 2.2: "By default, notes are displayed in a grid view layout."
  return "grid";
};

const initialNoteState = {
  loadedUserId: null,
  notes: [],
  sharedNotes: [],
  labels: [],
  activeNoteId: null,
  searchQuery: "",
  selectedLabelIds: [],
  activeSection: "recents",
  isLoading: false,
  unlockedNoteIds: new Set(),
};

const useNoteStore = create((set, get) => ({
  ...initialNoteState,
  viewMode: getInitialViewMode(),

  prepareForUser: (userId) => {
    const currentUserId = get().loadedUserId;
    if (currentUserId === userId) return;

    try {
      localStorage.removeItem("noteflow.lastActiveNoteId");
    } catch {
      /* ignore */
    }
    set({ ...initialNoteState, loadedUserId: userId, unlockedNoteIds: new Set() });
  },

  // -------------------- Bootstrap --------------------
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [notesRes, labelsRes, sharedRes] = await Promise.all([
        noteAPI.getAll(),
        labelAPI.getAll(),
        sharingAPI.getSharedWithMe().catch(() => ({ data: { data: [] } })),
      ]);
      set({
        loadedUserId: useAuthStore.getState().user?.id ?? null,
        notes: extractArray(notesRes.data).map(transformNote),
        labels: extractArray(labelsRes.data).map(transformLabel),
        sharedNotes: extractArray(sharedRes.data).map(transformNote),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // -------------------- Notes --------------------
  getNextUntitledTitle: () => {
    const existing = get().notes.filter((n) => n.title && n.title.startsWith("Untitled"));
    if (existing.length === 0) return "Untitled 1";
    const max = existing.reduce((maxVal, n) => {
      const m = n.title.match(/^Untitled\s+(\d+)$/i);
      if (m) return Math.max(maxVal, parseInt(m[1], 10));
      if (n.title.trim().toLowerCase() === "untitled") return Math.max(maxVal, 1);
      return maxVal;
    }, 0);
    return `Untitled ${max + 1}`;
  },

  setActiveNote: (id) => {
    try {
      if (id) localStorage.setItem("noteflow.lastActiveNoteId", String(id));
      else localStorage.removeItem("noteflow.lastActiveNoteId");
    } catch { /* ignore */ }
    set({ activeNoteId: id });
  },

  createNote: async () => {
    const defaultTitle = get().getNextUntitledTitle();
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    let defaultColor = null;
    try {
      const user = useAuthStore.getState().user;
      const prefColor = user?.preferences?.default_note_color ?? DEFAULT_NOTE_COLOR;
      if (prefColor === "random") {
        defaultColor = NOTE_COLOR_PRESETS[Math.floor(Math.random() * NOTE_COLOR_PRESETS.length)];
      } else if (/^#[0-9A-Fa-f]{6}$/.test(prefColor)) {
        defaultColor = prefColor;
      } else {
        defaultColor = DEFAULT_NOTE_COLOR;
      }
    } catch {
      defaultColor = DEFAULT_NOTE_COLOR;
    }

    const optimisticNote = {
      id: tempId,
      userId: null,
      title: defaultTitle,
      content: "",
      color: defaultColor,
      isPinned: false,
      pinnedAt: null,
      hasPassword: false,
      isShared: false,
      isOwner: true,
      sharePermission: null,
      owner: null,
      labels: [],
      shares: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      notes: [optimisticNote, ...s.notes],
      activeNoteId: tempId,
    }));

    // When offline: enqueue the creation so it replays when network is back.
    if (!navigator.onLine) {
      const payload = { title: defaultTitle, content: "" };
      if (defaultColor) payload.color = defaultColor;
      await enqueueMutation("note.create", { tempId, body: payload }).catch(() => {});
      return optimisticNote;
    }

    try {
      const payload = { title: defaultTitle, content: "" };
      if (defaultColor) payload.color = defaultColor;
      const { data } = await noteAPI.create(payload);
      const realNote = transformNote(data.data);
      set((s) => ({
        notes: s.notes.map((n) => (n.id === tempId ? realNote : n)),
        activeNoteId: s.activeNoteId === tempId ? realNote.id : s.activeNoteId,
      }));
      return realNote;
    } catch {
      // Network failed mid-flight; enqueue for later replay.
      const payload = { title: defaultTitle, content: "" };
      if (defaultColor) payload.color = defaultColor;
      await enqueueMutation("note.create", { tempId, body: payload }).catch(() => {});
      return optimisticNote;
    }
  },

  /**
   * Update a note. Accepts {title?, content?, labels?} - labels is converted to label_ids
   * for the API. All fields are forwarded so labels persist on the server.
   */
  updateNote: async (id, updates) => {
    // Optimistic update: apply changes but do NOT touch updatedAt so the note's
    // position in the sorted list stays stable during autosave.
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      sharedNotes: s.sharedNotes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
    // Temp notes haven't been created on the server yet. Update the pending
    // note.create mutation in IndexedDB so the flush sends the latest data.
    if (String(id).startsWith("temp-")) {
      try {
        const pending = await offlineStore.listPending();
        const createMut = pending.find(
          (m) => m.type === "note.create" && m.payload?.tempId === id,
        );
        if (createMut) {
          const merged = { ...createMut.payload.body };
          if (updates.title !== undefined) merged.title = updates.title;
          if (updates.content !== undefined) merged.content = updates.content;
          if (updates.color !== undefined) merged.color = updates.color;
          // Remove the old entry and re-enqueue with the updated body.
          await offlineStore.dropPending(createMut.id);
          await offlineStore.enqueue({
            type: "note.create",
            payload: { ...createMut.payload, body: merged },
          });
        }
      } catch { /* best-effort */ }
      return;
    }

    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.labels !== undefined) {
      payload.label_ids = (updates.labels || []).map((l) => l.id);
    }
    if (Object.keys(payload).length === 0) return;

    // When offline: enqueue the update for later replay (deduplicated by note id).
    if (!navigator.onLine) {
      await enqueueMutation("note.update", { id, body: payload }).catch(() => {});
      return;
    }

    try {
      const { data } = await noteAPI.update(id, payload);
      const fresh = transformNote(data.data);
      set((s) => ({
        notes: s.notes.map((n) => {
          if (n.id !== id) return n;
          // Preserve local attachments if there are more than what the server
          // returned (upload may have committed after the update response).
          const mergedAttachments =
            (n.attachments || []).length > (fresh.attachments || []).length
              ? n.attachments
              : fresh.attachments;
          return {
            ...fresh,
            // Keep the in-memory content (user may have typed more since save)
            content: n.content ?? fresh.content,
            attachments: mergedAttachments,
            // Preserve updatedAt so sort position stays stable until fetchAll.
            updatedAt: n.updatedAt,
          };
        }),
        sharedNotes: s.sharedNotes.map((n) => {
          if (n.id !== id) return n;
          const mergedAttachments =
            (n.attachments || []).length > (fresh.attachments || []).length
              ? n.attachments
              : fresh.attachments;
          return {
            ...fresh,
            content: n.content ?? fresh.content,
            attachments: mergedAttachments,
            owner: fresh.owner ?? n.owner,
            isOwner: fresh.isOwner ?? n.isOwner,
            sharePermission: fresh.sharePermission ?? n.sharePermission,
            sharedAt: fresh.sharedAt ?? n.sharedAt,
            updatedAt: n.updatedAt,
          };
        }),
      }));
    } catch {
      // Mid-flight network failure — enqueue so it replays on reconnect.
      await enqueueMutation("note.update", { id, body: payload }).catch(() => {});
    }
  },

  /**
   * Apply a remote update from the WebSocket (NoteUpdated event).
   * Merge into the local state without re-broadcasting.
   */
  applyRemoteNoteUpdate: (id, patch) => {
    set((s) => {
      const next = { ...s };
      const mergeRemotePatch = (n) => {
        if (n.id !== id) return n;

        // A locked-note payload uses null/omitted content to mean "content is
        // hidden", not "content was deleted". Keep the local copy intact.
        const { content, ...rest } = patch;
        return content === null || content === undefined
          ? { ...n, ...rest }
          : { ...n, ...rest, content };
      };

      next.notes = s.notes.map(mergeRemotePatch);
      next.sharedNotes = s.sharedNotes.map(mergeRemotePatch);
      // If the note was remotely locked, remove it from the unlocked set so the
      // UnlockOverlay is shown again immediately.
      if (patch.hasPassword === true) {
        const unlocked = new Set(s.unlockedNoteIds);
        unlocked.delete(id);
        next.unlockedNoteIds = unlocked;
      }
      return next;
    });
  },

  deleteNote: async (id) => {
    // Optimistic removal.
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    }));
    if (!navigator.onLine) {
      await enqueueMutation("note.delete", { id }).catch(() => {});
      return;
    }
    try {
      await noteAPI.delete(id);
    } catch {
      await enqueueMutation("note.delete", { id }).catch(() => {});
    }
  },

  togglePin: async (id) => {
    // Optimistic toggle.
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? {
            ...n,
            isPinned: !n.isPinned,
            pinnedAt: !n.isPinned ? new Date().toISOString() : null,
          }
          : n,
      ),
    }));
    if (!navigator.onLine) {
      await enqueueMutation("note.togglePin", { id }).catch(() => {});
      return;
    }
    try {
      await noteAPI.togglePin(id);
    } catch {
      await enqueueMutation("note.togglePin", { id }).catch(() => {});
    }
  },

  // -------------------- Per-note password --------------------
  setNotePassword: async (id, payload) => {
    // payload: { action: 'set'|'change'|'disable', password?, password_confirmation?, current_password? }
    const { data } = await noteAPI.setPassword(id, payload);
    const fresh = transformNote(data.data);
    const mergePasswordUpdate = (n) => {
      if (n.id !== id) return n;

      return {
        ...n,
        ...fresh,
        content: payload.action === "disable"
          ? (fresh.content ?? n.content ?? "")
          : (n.content ?? fresh.content),
      };
    };

    set((s) => ({
      // Preserve existing content: when a password is set/changed, the server
      // returns content=null (hidden). We must NOT overwrite the in-memory
      // content or the user's current editing session will be lost.
      notes: s.notes.map(mergePasswordUpdate),
      sharedNotes: s.sharedNotes.map(mergePasswordUpdate),
      unlockedNoteIds: payload.action === "disable"
        ? new Set([...s.unlockedNoteIds].filter((x) => x !== id))
        : s.unlockedNoteIds,
    }));
    return fresh;
  },

  unlockNote: async (id, password) => {
    const { data } = await noteAPI.unlock(id, password);
    set((s) => {
      const next = new Set(s.unlockedNoteIds);
      next.add(id);
      return {
        // Update both own notes and shared notes so recipients can unlock too
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, content: data.content } : n,
        ),
        sharedNotes: s.sharedNotes.map((n) =>
          n.id === id ? { ...n, content: data.content } : n,
        ),
        unlockedNoteIds: next,
      };
    });
  },

  isUnlocked: (id) => get().unlockedNoteIds.has(id),

  // -------------------- Labels --------------------
  addLabel: async (name, color) => {
    try {
      const { data } = await labelAPI.create({ name, color });
      const label = transformLabel(data.data);
      set((s) => ({ labels: [...s.labels, label] }));
      return label;
    } catch {
      return null;
    }
  },

  updateLabel: async (id, name, color) => {
    try {
      const payload = { name };
      if (color) payload.color = color;
      const { data } = await labelAPI.update(id, payload);
      const label = transformLabel(data.data);
      set((s) => ({
        labels: s.labels.map((l) => (l.id === id ? label : l)),
        // Cascade rename on note labels
        notes: s.notes.map((n) => ({
          ...n,
          labels: n.labels.map((l) => (l.id === id ? label : l)),
        })),
      }));
      return label;
    } catch {
      return null;
    }
  },

  deleteLabel: async (id) => {
    set((s) => ({
      labels: s.labels.filter((l) => l.id !== id),
      selectedLabelIds: s.selectedLabelIds.filter((x) => x !== id),
      // Cascade remove on note labels (note itself is preserved per spec)
      notes: s.notes.map((n) => ({
        ...n,
        labels: n.labels.filter((l) => l.id !== id),
      })),
    }));
    try {
      await labelAPI.delete(id);
    } catch {
      /* silent */
    }
  },

  // -------------------- Sharing --------------------
  shareNote: async (noteId, email, permission) => {
    const { data } = await sharingAPI.share(noteId, { email, permission });
    const share = transformShare(data.data);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? {
            ...n,
            isShared: true,
            shares: [...(n.shares || []).filter((x) => x.email !== email), share],
          }
          : n,
      ),
    }));
    return share;
  },

  updateSharePermission: async (noteId, shareId, permission) => {
    const { data } = await sharingAPI.updatePermission(noteId, shareId, permission);
    const share = transformShare(data.data);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, shares: n.shares.map((x) => (x.id === shareId ? share : x)) }
          : n,
      ),
    }));
    return share;
  },

  revokeShare: async (noteId, shareId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? {
            ...n,
            shares: n.shares.filter((x) => x.id !== shareId),
            isShared: n.shares.filter((x) => x.id !== shareId).length > 0,
          }
          : n,
      ),
    }));
    try {
      await sharingAPI.revoke(noteId, shareId);
    } catch {
      /* silent */
    }
  },

  refreshSharedWithMe: async () => {
    try {
      const { data } = await sharingAPI.getSharedWithMe();
      set({ sharedNotes: extractArray(data).map(transformNote) });
    } catch (e) {
      console.error("Failed to refresh shared notes:", e);
    }
  },

  // -------------------- Attachments --------------------
  uploadAttachments: async (noteId, files) => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files[]", f));
    const { data } = await attachmentAPI.upload(noteId, formData);
    const newAttachments = (data.data || []).map(transformAttachment);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, attachments: [...(n.attachments || []), ...newAttachments] }
          : n,
      ),
    }));
    return newAttachments;
  },

  deleteAttachment: async (noteId, attachmentId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? {
            ...n,
            attachments: (n.attachments || []).filter((a) => a.id !== attachmentId),
          }
          : n,
      ),
    }));
    try {
      await attachmentAPI.delete(noteId, attachmentId);
    } catch {
      /* silent */
    }
  },

  // -------------------- UI state --------------------
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleLabelFilter: (labelId) =>
    set((s) => ({
      selectedLabelIds: s.selectedLabelIds.includes(labelId)
        ? s.selectedLabelIds.filter((x) => x !== labelId)
        : [...s.selectedLabelIds, labelId],
    })),

  clearLabelFilters: () => set({ selectedLabelIds: [] }),

  setActiveSection: (section) =>
    set({ activeSection: section, selectedLabelIds: [] }),

  setViewMode: (mode) => {
    try {
      localStorage.setItem("noteflow.viewMode", mode);
    } catch {
      /* ignore */
    }
    set({ viewMode: mode });
  },

  getActiveNote: () => {
    const s = get();
    return (
      s.notes.find((n) => n.id === s.activeNoteId) ||
      s.sharedNotes.find((n) => n.id === s.activeNoteId) ||
      null
    );
  },
}));

export default useNoteStore;
