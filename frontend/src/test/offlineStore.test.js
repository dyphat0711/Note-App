import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("localforage", () => {
  const make = () => {
    const map = new Map();
    return {
      async setItem(k, v) {
        map.set(String(k), v);
        return v;
      },
      async getItem(k) {
        return map.has(String(k)) ? map.get(String(k)) : null;
      },
      async removeItem(k) {
        map.delete(String(k));
      },
      async clear() {
        map.clear();
      },
      async iterate(cb) {
        for (const [k, v] of map.entries()) {
          cb(v, k);
        }
      },
    };
  };
  return {
    default: {
      createInstance: () => make(),
    },
  };
});

beforeEach(async () => {
  vi.resetModules();
});

describe("offlineStore", () => {
  it("queues and lists pending mutations in FIFO order", async () => {
    const { offlineStore } = await import("../lib/offlineStore");
    await offlineStore.enqueue({ url: "/a", method: "POST", body: { x: 1 } });
    await new Promise((r) => setTimeout(r, 2));
    await offlineStore.enqueue({ url: "/b", method: "PUT", body: { y: 2 } });

    const queue = await offlineStore.listPending();
    expect(queue).toHaveLength(2);
    expect(queue[0].url).toBe("/a");
    expect(queue[1].url).toBe("/b");
  });

  it("dropPending removes a single entry", async () => {
    const { offlineStore } = await import("../lib/offlineStore");
    const id1 = await offlineStore.enqueue({ url: "/a", method: "POST" });
    const id2 = await offlineStore.enqueue({ url: "/b", method: "POST" });

    await offlineStore.dropPending(id1);
    const remaining = await offlineStore.listPending();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
  });

  it("upserts and lists notes sorted by updatedAt desc", async () => {
    const { offlineStore } = await import("../lib/offlineStore");
    await offlineStore.upsertNote({ id: 1, title: "old", updatedAt: "2025-01-01T00:00:00Z" });
    await offlineStore.upsertNote({ id: 2, title: "new", updatedAt: "2026-05-04T00:00:00Z" });

    const notes = await offlineStore.getNotes();
    expect(notes.map((n) => n.id)).toEqual([2, 1]);
  });

  it("removeNote deletes a record", async () => {
    const { offlineStore } = await import("../lib/offlineStore");
    await offlineStore.upsertNote({ id: 1, title: "x", updatedAt: new Date().toISOString() });
    await offlineStore.removeNote(1);
    const notes = await offlineStore.getNotes();
    expect(notes).toHaveLength(0);
  });

  it("setMeta and getMeta round-trip", async () => {
    const { offlineStore } = await import("../lib/offlineStore");
    await offlineStore.setMeta("lastSync", "2026-05-04T20:00:00Z");
    expect(await offlineStore.getMeta("lastSync")).toBe("2026-05-04T20:00:00Z");
  });
});
