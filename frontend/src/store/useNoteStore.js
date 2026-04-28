import { create } from "zustand";
import { noteAPI, labelAPI, folderAPI } from "../api/services";

function transformNote(n) {
  return {
    id: n.id,
    userId: n.user_id,
    folderId: n.folder_id,
    title: n.title,
    content: n.content,
    isPinned: n.is_pinned,
    pinnedAt: n.pinned_at,
    hasPassword: n.has_password,
    labels: (n.labels || []).map((l) => transformLabel(l)),
    shares: n.shares || [],
    folder: n.folder || null,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

function transformLabel(l) {
  return { id: l.id, name: l.name, color: l.color || "#3b82f6" };
}

function transformFolder(f) {
  return { id: f.id, name: f.name, notesCount: f.notes_count || 0 };
}

const useNoteStore = create((set, get) => ({
  notes: [],
  labels: [],
  folders: [],
  activeNoteId: null,
  viewMode: "list",
  searchQuery: "",
  selectedLabel: null,
  selectedFolder: null,
  activeSection: "recents",
  isLoading: false,
  unlockedNoteIds: new Set(),

  // ---------- Fetch all data on mount ----------
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [notesRes, labelsRes, foldersRes] = await Promise.all([
        noteAPI.getAll(),
        labelAPI.getAll(),
        folderAPI.getAll(),
      ]);
      set({
        notes: (notesRes.data.data || []).map(transformNote),
        labels: (labelsRes.data.data || []).map(transformLabel),
        folders: (foldersRes.data.data || []).map(transformFolder),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // ---------- Notes ----------
  setActiveNote: (id) => set({ activeNoteId: id }),

  createNote: async () => {
    const state = get();
    const folderId = state.selectedFolder || null;
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticNote = {
      id: tempId,
      userId: null,
      folderId,
      title: "Untitled",
      content: "",
      isPinned: false,
      pinnedAt: null,
      hasPassword: false,
      labels: [],
      shares: [],
      folder: null,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({
      notes: [optimisticNote, ...s.notes],
      activeNoteId: tempId,
    }));

    try {
      const { data } = await noteAPI.create({
        title: "Untitled",
        content: "",
        folder_id: folderId,
      });
      const realNote = transformNote(data.data);
      set((s) => ({
        notes: s.notes.map((n) => (n.id === tempId ? realNote : n)),
        activeNoteId: s.activeNoteId === tempId ? realNote.id : s.activeNoteId,
      }));
    } catch {
      // keep the local note so the UI still works offline
    }
  },

  updateNote: async (id, updates) => {
    // Optimistic local update
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n,
      ),
    }));
    try {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;
      if (Object.keys(payload).length > 0) {
        await noteAPI.update(id, payload);
      }
    } catch {
      // revert could be added; for now keep optimistic
    }
  },

  deleteNote: async (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    }));
    try {
      await noteAPI.delete(id);
    } catch {
      // silent
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
      // silent
    }
  },

  setNotePassword: async (id, password) => {
    const isTemp = String(id).startsWith("temp-");
    // Optimistic update
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, hasPassword: password !== null } : n,
      ),
    }));
    if (!isTemp) {
      await noteAPI.setPassword(id, password);
    }
  },

  unlockNote: async (id, password) => {
    const { data } = await noteAPI.unlock(id, password);
    set((s) => {
      const newUnlocked = new Set(s.unlockedNoteIds);
      newUnlocked.add(id);
      return {
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, content: data.content } : n,
        ),
        unlockedNoteIds: newUnlocked,
      };
    });
  },

  moveNote: async (noteId, folderId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, folderId } : n,
      ),
    }));
    try {
      await noteAPI.move(noteId, folderId);
    } catch {
      // silent
    }
  },

  // ---------- Labels ----------
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
      }));
    } catch {
      // silent
    }
  },

  deleteLabel: async (id) => {
    set((s) => ({ labels: s.labels.filter((l) => l.id !== id) }));
    try {
      await labelAPI.delete(id);
    } catch {
      // silent
    }
  },

  // ---------- Folders ----------
  createFolder: async (name) => {
    try {
      const { data } = await folderAPI.create({ name });
      const folder = transformFolder(data.data);
      set((s) => ({ folders: [...s.folders, folder] }));
      return folder;
    } catch {
      return null;
    }
  },

  updateFolder: async (id, name) => {
    try {
      const { data } = await folderAPI.update(id, { name });
      const folder = transformFolder(data.data);
      set((s) => ({
        folders: s.folders.map((f) => (f.id === id ? folder : f)),
      }));
    } catch {
      // silent
    }
  },

  deleteFolder: async (id) => {
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      selectedFolder: s.selectedFolder === id ? null : s.selectedFolder,
    }));
    try {
      await folderAPI.delete(id);
    } catch {
      // silent
    }
  },

  // ---------- UI state ----------
  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedLabel: (labelId) =>
    set((s) => ({
      selectedLabel: s.selectedLabel === labelId ? null : labelId,
      selectedFolder: null,
      activeSection: "recents",
    })),

  setSelectedFolder: (folderId) =>
    set((s) => ({
      selectedFolder: s.selectedFolder === folderId ? null : folderId,
      selectedLabel: null,
      activeSection: "recents",
    })),

  setActiveSection: (section) =>
    set({ activeSection: section, selectedLabel: null, selectedFolder: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  getActiveNote: () => {
    const s = get();
    return s.notes.find((n) => n.id === s.activeNoteId) || null;
  },
}));

export default useNoteStore;
