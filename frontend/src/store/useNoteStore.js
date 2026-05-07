import { create } from "zustand";
import {
  noteAPI,
  labelAPI,
  sharingAPI,
  attachmentAPI,
} from "../api/services";

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
    permission: s.permission,
    sharedAt: s.shared_at || s.created_at,
  };
}

function transformAttachment(a) {
  return {
    id: a.id,
    noteId: a.note_id,
    name: a.original_name,
    url: a.url || a.download_url,
    downloadUrl: a.download_url,
    mime: a.mime_type,
    size: a.size,
  };
}

function transformNote(n) {
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title,
    content: n.content,
    isPinned: Boolean(n.is_pinned),
    pinnedAt: n.pinned_at,
    hasPassword: Boolean(n.has_password),
    isShared: Boolean(n.is_shared),
    isOwner: n.is_owner ?? true,
    sharePermission: n.share_permission ?? null,
    owner: n.owner || null,
    labels: (n.labels || []).map(transformLabel),
    shares: (n.shares || []).map(transformShare),
    attachments: (n.attachments || []).map(transformAttachment),
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

const initialPreferredView = (() => {
  try {
    const v = localStorage.getItem("noteflow.viewMode");
    if (v === "grid" || v === "list") return v;
  } catch {
    /* ignore */
  }
  // Spec section 2.2: "By default, notes are displayed in a grid view layout."
  return "grid";
})();

const useNoteStore = create((set, get) => ({
  notes: [],
  sharedNotes: [],
  labels: [],
  activeNoteId: null,
  viewMode: initialPreferredView,
  searchQuery: "",
  selectedLabelIds: [], // multi-select label filter
  activeSection: "recents", // "recents" | "favorites" | "shared"
  isLoading: false,
  unlockedNoteIds: new Set(),

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
        notes: (notesRes.data.data || []).map(transformNote),
        labels: (labelsRes.data.data || []).map(transformLabel),
        sharedNotes: (sharedRes.data.data || []).map(transformNote),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // -------------------- Notes --------------------
  setActiveNote: (id) => set({ activeNoteId: id }),

  createNote: async () => {
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticNote = {
      id: tempId,
      userId: null,
      title: "Untitled",
      content: "",
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
    try {
      const { data } = await noteAPI.create({ title: "Untitled", content: "" });
      const realNote = transformNote(data.data);
      set((s) => ({
        notes: s.notes.map((n) => (n.id === tempId ? realNote : n)),
        activeNoteId: s.activeNoteId === tempId ? realNote.id : s.activeNoteId,
      }));
      return realNote;
    } catch {
      return optimisticNote;
    }
  },

  /**
   * Update a note. Accepts {title?, content?, labels?} - labels is converted to label_ids
   * for the API. All fields are forwarded so labels persist on the server.
   */
  updateNote: async (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
      ),
      sharedNotes: s.sharedNotes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
      ),
    }));
    if (String(id).startsWith("temp-")) return;
    try {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.labels !== undefined) {
        payload.label_ids = (updates.labels || []).map((l) => l.id);
      }
      if (Object.keys(payload).length > 0) {
        const { data } = await noteAPI.update(id, payload);
        const fresh = transformNote(data.data);
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...fresh, content: n.content ?? fresh.content } : n)),
          sharedNotes: s.sharedNotes.map((n) => (n.id === id ? fresh : n)),
        }));
      }
    } catch {
      /* keep optimistic state; UI shows latest input */
    }
  },

  /**
   * Apply a remote update from the WebSocket (NoteUpdated event).
   * Merge into the local state without re-broadcasting.
   */
  applyRemoteNoteUpdate: (id, patch) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      sharedNotes: s.sharedNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  },

  deleteNote: async (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    }));
    try {
      await noteAPI.delete(id);
    } catch {
      /* silent */
    }
  },

  togglePin: async (id) => {
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
    try {
      await noteAPI.togglePin(id);
    } catch {
      /* silent */
    }
  },

  // -------------------- Per-note password --------------------
  setNotePassword: async (id, payload) => {
    // payload: { action: 'set'|'change'|'disable', password?, password_confirmation?, current_password? }
    const { data } = await noteAPI.setPassword(id, payload);
    const fresh = transformNote(data.data);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? fresh : n)),
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
        notes: s.notes.map((n) =>
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
      set({ sharedNotes: (data.data || []).map(transformNote) });
    } catch {
      /* silent */
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
