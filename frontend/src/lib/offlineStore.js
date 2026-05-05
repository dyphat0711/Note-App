import localforage from "localforage";

/**
 * Offline persistence layer (IndexedDB via localforage).
 *  - notes / labels: optimistic snapshots so the app remains functional offline.
 *  - pending: a FIFO queue of mutations that will be replayed when the network is back.
 */
const stores = {
  notes: localforage.createInstance({
    name: "noteflow",
    storeName: "notes",
  }),
  labels: localforage.createInstance({
    name: "noteflow",
    storeName: "labels",
  }),
  pending: localforage.createInstance({
    name: "noteflow",
    storeName: "pending_mutations",
  }),
  meta: localforage.createInstance({
    name: "noteflow",
    storeName: "meta",
  }),
};

export const offlineStore = {
  // ---------- Notes ----------
  async getNotes() {
    const notes = [];
    await stores.notes.iterate((value) => {
      notes.push(value);
    });
    return notes.sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  },
  async putNotes(notes) {
    await stores.notes.clear();
    for (const note of notes) {
      await stores.notes.setItem(String(note.id), note);
    }
  },
  async upsertNote(note) {
    await stores.notes.setItem(String(note.id), note);
  },
  async removeNote(id) {
    await stores.notes.removeItem(String(id));
  },

  // ---------- Labels ----------
  async getLabels() {
    const labels = [];
    await stores.labels.iterate((value) => {
      labels.push(value);
    });
    return labels;
  },
  async putLabels(labels) {
    await stores.labels.clear();
    for (const label of labels) {
      await stores.labels.setItem(String(label.id), label);
    }
  },

  // ---------- Pending mutations queue ----------
  async enqueue(mutation) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await stores.pending.setItem(id, { ...mutation, id, createdAt: Date.now() });
    return id;
  },
  async listPending() {
    const items = [];
    await stores.pending.iterate((value) => {
      items.push(value);
    });
    return items.sort((a, b) => a.createdAt - b.createdAt);
  },
  async dropPending(id) {
    await stores.pending.removeItem(String(id));
  },
  async clearPending() {
    await stores.pending.clear();
  },

  // ---------- Last-sync metadata ----------
  async setMeta(key, value) {
    await stores.meta.setItem(key, value);
  },
  async getMeta(key) {
    return stores.meta.getItem(key);
  },
  async clearAll() {
    await stores.notes.clear();
    await stores.labels.clear();
    await stores.pending.clear();
    await stores.meta.clear();
  },
};

export default offlineStore;
