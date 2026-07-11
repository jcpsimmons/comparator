import { describe, expect, it } from "vitest";
import {
  CORRUPT_BACKUP_KEY,
  STORAGE_KEY,
  createDefaultState,
  createSampleTasks,
} from "./constants";
import {
  exportState,
  importState,
  loadState,
  saveState,
  validateAppState,
  type StorageLike,
} from "./storage";
import type { AppState } from "./types";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  store: Record<string, string>;
} {
  const store = { ...initial };
  return {
    store,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe("validateAppState", () => {
  it("accepts default state", () => {
    expect(validateAppState(createDefaultState())).toBe(true);
  });

  it("rejects missing version, bad tasks, bad filters", () => {
    expect(validateAppState(null)).toBe(false);
    expect(validateAppState({ version: 2, tasks: [], activeView: "kanban", searchQuery: "", filters: createDefaultState().filters })).toBe(false);
    expect(
      validateAppState({
        version: 1,
        tasks: [{ id: "x" }],
        activeView: "kanban",
        searchQuery: "",
        filters: createDefaultState().filters,
      }),
    ).toBe(false);
    expect(
      validateAppState({
        version: 1,
        tasks: [],
        activeView: "nope",
        searchQuery: "",
        filters: createDefaultState().filters,
      }),
    ).toBe(false);
  });
});

describe("loadState / saveState", () => {
  it("seeds sample tasks when storage is empty", () => {
    const storage = memoryStorage();
    const result = loadState(storage);
    expect(result.ok).toBe(true);
    expect(result.state.tasks).toHaveLength(6);
    const titles = result.state.tasks.map((t) => t.title);
    expect(titles).toContain("Clarify project scope");
    expect(titles).toContain("Archive completed notes");
    const samples = createSampleTasks();
    const archive = result.state.tasks.find((t) => t.title === "Archive completed notes")!;
    expect(archive.status).toBe("done");
    expect(archive.completedAt).not.toBeNull();
    const scope = result.state.tasks.find((t) => t.title === "Clarify project scope")!;
    expect(scope.status).toBe("todo");
    expect(scope.urgent).toBe(true);
    expect(scope.important).toBe(true);
    expect(samples).toHaveLength(6);
  });

  it("round-trips save and load", () => {
    const storage = memoryStorage();
    const state = createDefaultState();
    state.searchQuery = "hello";
    state.activeView = "list";
    saveState(state, storage);
    expect(storage.store[STORAGE_KEY]).toBeTruthy();
    const loaded = loadState(storage);
    expect(loaded.ok).toBe(true);
    expect(loaded.state.searchQuery).toBe("hello");
    expect(loaded.state.activeView).toBe("list");
    expect(loaded.state.tasks).toHaveLength(state.tasks.length);
  });

  it("backs up corrupt payload and resets", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: "{not-json",
    });
    const result = loadState(storage);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected fail");
    expect(result.recoveredFromCorrupt).toBe(true);
    expect(storage.store[CORRUPT_BACKUP_KEY]).toBe("{not-json");
    expect(result.state.tasks).toHaveLength(6);
  });

  it("backs up structurally invalid JSON", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 1, tasks: "nope" }),
    });
    const result = loadState(storage);
    expect(result.ok).toBe(false);
    expect(storage.store[CORRUPT_BACKUP_KEY]).toContain("nope");
  });
});

describe("exportState / importState", () => {
  it("exports full AppState with dated filename", () => {
    const state = createDefaultState();
    const { filename, json } = exportState(state, new Date(2026, 6, 10));
    expect(filename).toBe("priority-board-export-2026-07-10.json");
    const parsed = JSON.parse(json) as AppState;
    expect(validateAppState(parsed)).toBe(true);
    expect(parsed.tasks).toHaveLength(state.tasks.length);
  });

  it("imports valid JSON and rejects invalid", async () => {
    const state = createDefaultState();
    state.searchQuery = "imported";
    const ok = await importState(JSON.stringify(state));
    expect(ok.ok).toBe(true);
    if (!ok.ok) throw new Error("expected ok");
    expect(ok.state.searchQuery).toBe("imported");

    const bad = await importState("{broken");
    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error("expected fail");
    expect(bad.error).toMatch(/json/i);

    const invalid = await importState(JSON.stringify({ version: 1 }));
    expect(invalid.ok).toBe(false);
  });
});
