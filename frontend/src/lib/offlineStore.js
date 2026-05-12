import localforage from "localforage";

/**
 * Offline persistence layer (IndexedDB via localforage).
 *
 *  Stores:
 *  - notes          : optimistic snapshots (keyed by note id as string)
 *  - labels         : optimistic snapshots (keyed by label id as string)
 *  - pending        : FIFO queue of mutations to replay when network is back
 *  - meta           : last-sync timestamps and misc bookkeeping
 *  - user           : cached authenticated user profile for offline cold-start
 *
 *  Conflict policy: last-write-wins by client `updatedAt`.
 */
const stores = {
  notes: localforage.createInstance({ name: "noteflow", storeName: "notes" }),
  labels: localforage.createInstance({ name: "noteflow", storeName: "labels" }),
  pending: localforage.createInstance({ name: "noteflow", storeName: "pending_mutations" }),
  meta: localforage.createInstance({ name: "noteflow", storeName: "meta" }),
  user: localforage.createInstance({ name: "noteflow", storeName: "user" }),
};

export const offlineStore = {
  // ─────────────────────────── Notes ───────────────────────────
  async getNotes() {
    const notes = [];
    await stores.notes.iterate((value) => notes.push(value));
    return notes.sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  },
  async putNotes(notes) {
    await stores.notes.clear();
    await Promise.all(notes.map((note) => stores.notes.setItem(String(note.id), note)));
  },
  async upsertNote(note) {
    await stores.notes.setItem(String(note.id), note);
  },
  async removeNote(id) {
    await stores.notes.removeItem(String(id));
  },

  // ─────────────────────────── Labels ──────────────────────────
  async getLabels() {
    const labels = [];
    await stores.labels.iterate((value) => labels.push(value));
    return labels;
  },
  async putLabels(labels) {
    await stores.labels.clear();
    await Promise.all(labels.map((label) => stores.labels.setItem(String(label.id), label)));
  },

  // ─────────────────────── Pending mutations ───────────────────
  /**
   * Enqueue a mutation. Returns the generated queue id.
   * @param {{ type: string, payload: object }} mutation
   */
  async enqueue(mutation) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await stores.pending.setItem(id, { ...mutation, id, createdAt: Date.now() });
    return id;
  },

  /**
   * Enqueue a note.update, collapsing any previous pending update for the
   * same note id so we don't replay stale intermediate saves.
   */
  async enqueueNoteUpdate(noteId, body) {
    const existing = await this.listPending();
    const prev = existing.find(
      (m) => m.type === "note.update" && m.payload?.id === noteId,
    );
    if (prev) {
      // Merge the new body into the existing pending mutation.
      const merged = { ...prev, payload: { ...prev.payload, body: { ...prev.payload.body, ...body } } };
      await stores.pending.setItem(prev.id, merged);
      return prev.id;
    }
    return this.enqueue({ type: "note.update", payload: { id: noteId, body } });
  },

  async listPending() {
    const items = [];
    await stores.pending.iterate((value) => items.push(value));
    return items.sort((a, b) => a.createdAt - b.createdAt);
  },

  async dropPending(id) {
    await stores.pending.removeItem(String(id));
  },

  async clearPending() {
    await stores.pending.clear();
  },

  // ──────────────────── Last-sync metadata ─────────────────────
  async setMeta(key, value) {
    await stores.meta.setItem(key, value);
  },
  async getMeta(key) {
    return stores.meta.getItem(key);
  },

  // ──────────────────── Cached user profile ────────────────────
  async putUser(user) {
    await stores.user.setItem("profile", user);
  },
  async getUser() {
    return stores.user.getItem("profile");
  },
  async clearUser() {
    await stores.user.clear();
  },

  // ─────────────────────── Full wipe ───────────────────────────
  async clearAll() {
    await Promise.all([
      stores.notes.clear(),
      stores.labels.clear(),
      stores.pending.clear(),
      stores.meta.clear(),
      stores.user.clear(),
    ]);
  },
};

export default offlineStore;
