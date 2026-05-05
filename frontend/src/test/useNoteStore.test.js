import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage so that initial preferred view doesn't crash in jsdom.
beforeEach(() => {
  vi.resetModules();
});

vi.mock("../api/services", () => {
  const noteAPI = {
    getAll: vi.fn(async () => ({ data: { data: [] } })),
    create: vi.fn(async (payload) => ({
      data: {
        data: {
          id: 1,
          user_id: 1,
          title: payload.title,
          content: payload.content,
          is_pinned: false,
          pinned_at: null,
          has_password: false,
          is_shared: false,
          is_owner: true,
          share_permission: null,
          owner: null,
          labels: [],
          shares: [],
          attachments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    })),
    update: vi.fn(async (id, payload) => ({
      data: {
        data: {
          id,
          user_id: 1,
          title: payload.title ?? "T",
          content: payload.content ?? "C",
          is_pinned: false,
          pinned_at: null,
          has_password: false,
          is_shared: false,
          is_owner: true,
          share_permission: null,
          owner: null,
          labels: [],
          shares: [],
          attachments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    })),
    delete: vi.fn(async () => ({ data: {} })),
    togglePin: vi.fn(async () => ({ data: {} })),
    setPassword: vi.fn(),
    unlock: vi.fn(),
  };
  const labelAPI = {
    getAll: vi.fn(async () => ({ data: { data: [] } })),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const sharingAPI = {
    getSharedWithMe: vi.fn(async () => ({ data: { data: [] } })),
    share: vi.fn(),
    revoke: vi.fn(),
    updatePermission: vi.fn(),
  };
  const attachmentAPI = {
    upload: vi.fn(),
    delete: vi.fn(),
  };
  return { noteAPI, labelAPI, sharingAPI, attachmentAPI };
});

describe("useNoteStore", () => {
  it("starts with default state (grid view, empty notes)", async () => {
    const { default: useNoteStore } = await import("../store/useNoteStore");
    const state = useNoteStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.viewMode).toBe("grid");
    expect(state.selectedLabelIds).toEqual([]);
  });

  it("createNote inserts an optimistic note then replaces with API result", async () => {
    const { default: useNoteStore } = await import("../store/useNoteStore");
    await useNoteStore.getState().createNote();
    const notes = useNoteStore.getState().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe(1);
    expect(notes[0].title).toBe("Untitled");
  });

  it("toggleLabelFilter adds and removes label IDs", async () => {
    const { default: useNoteStore } = await import("../store/useNoteStore");
    useNoteStore.getState().toggleLabelFilter(5);
    expect(useNoteStore.getState().selectedLabelIds).toEqual([5]);
    useNoteStore.getState().toggleLabelFilter(7);
    expect(useNoteStore.getState().selectedLabelIds).toEqual([5, 7]);
    useNoteStore.getState().toggleLabelFilter(5);
    expect(useNoteStore.getState().selectedLabelIds).toEqual([7]);
    useNoteStore.getState().clearLabelFilters();
    expect(useNoteStore.getState().selectedLabelIds).toEqual([]);
  });

  it("setViewMode persists to localStorage and updates state", async () => {
    const { default: useNoteStore } = await import("../store/useNoteStore");
    useNoteStore.getState().setViewMode("list");
    expect(useNoteStore.getState().viewMode).toBe("list");
    expect(localStorage.getItem("noteflow.viewMode")).toBe("list");
  });

  it("applyRemoteNoteUpdate merges fields without re-fetching", async () => {
    const { default: useNoteStore } = await import("../store/useNoteStore");
    await useNoteStore.getState().createNote();
    const id = useNoteStore.getState().notes[0].id;
    useNoteStore.getState().applyRemoteNoteUpdate(id, { title: "Live" });
    expect(useNoteStore.getState().notes[0].title).toBe("Live");
  });
});
