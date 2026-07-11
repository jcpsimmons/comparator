import { afterEach, describe, expect, test } from "bun:test";
import {
  CORRUPT_BACKUP_KEY,
  createDefaultState,
  QUADRANT_FLAGS,
  STORAGE_KEY,
} from "../src/constants";
import {
  consumeCorruptStateRecovery,
  importState,
  loadState,
  validateAppState,
} from "../src/storage";
import {
  createTask,
  filterTasks,
  formatDueDate,
  getQuadrant,
  isDueToday,
  isDueWithinNext7Days,
  isOverdue,
  normalizeTags,
  sortTasksForList,
  updateTask,
} from "../src/taskUtils";
import type { Task, TaskFilters } from "../src/types";

const NO_FILTERS: TaskFilters = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function withDueDate(task: Task, dueDate: string): Task {
  return { ...task, dueDate };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
  consumeCorruptStateRecovery();
});

describe("task model helpers", () => {
  test("derives every Eisenhower quadrant", () => {
    for (const [quadrant, flags] of Object.entries(QUADRANT_FLAGS)) {
      expect(getQuadrant(flags)).toBe(quadrant);
    }
  });

  test("normalizes comma-separated tags without losing first casing", () => {
    expect(normalizeTags(" Planning, admin, planning, ADMIN, , Review ")).toEqual([
      "Planning",
      "admin",
      "Review",
    ]);
  });

  test("creates and updates completion timestamps consistently", () => {
    const createdAt = new Date("2026-07-10T12:00:00.000Z");
    const task = createTask(
      { title: "  Ship update  ", status: "todo", tags: "Work, work" },
      [],
      createdAt,
    );
    expect(task.title).toBe("Ship update");
    expect(task.tags).toEqual(["Work"]);
    expect(task.completedAt).toBeNull();

    const completed = updateTask(task, { status: "done" }, new Date("2026-07-10T13:00:00.000Z"));
    expect(completed.completedAt).toBe("2026-07-10T13:00:00.000Z");
    expect(updateTask(completed, { status: "todo" }).completedAt).toBeNull();
  });
});

describe("due dates, filtering, and list priority", () => {
  const today = new Date(2026, 6, 10, 12);
  const base = createDefaultState(today).tasks[0];

  test("uses local calendar dates for due categories", () => {
    expect(isOverdue(withDueDate(base, "2026-07-09"), today)).toBe(true);
    expect(isDueToday(withDueDate(base, "2026-07-10"), today)).toBe(true);
    expect(isDueWithinNext7Days(withDueDate(base, "2026-07-17"), today)).toBe(true);
    expect(isDueWithinNext7Days(withDueDate(base, "2026-07-18"), today)).toBe(false);
    expect(isOverdue({ ...withDueDate(base, "2026-07-09"), status: "done" }, today)).toBe(false);
    const completedTomorrow = {
      ...withDueDate(base, "2026-07-11"),
      status: "done" as const,
      completedAt: today.toISOString(),
    };
    expect(isDueWithinNext7Days(completedTomorrow, today)).toBe(true);
    expect(formatDueDate(completedTomorrow, today)).toBe("Tomorrow");
  });

  test("searches title, description, and tags and composes filters", () => {
    const tasks = createDefaultState(today).tasks.map((task, index) => ({
      ...task,
      description: index === 0 ? "A hidden launch detail" : task.description,
    }));

    expect(filterTasks(tasks, "launch detail", NO_FILTERS)).toHaveLength(1);
    expect(filterTasks(tasks, "admin", NO_FILTERS)).toHaveLength(2);
    expect(
      filterTasks(tasks, "", {
        ...NO_FILTERS,
        statuses: ["todo"],
        quadrants: ["doNow"],
      }),
    ).toHaveLength(1);
  });

  test("default list ordering puts open overdue work before completed work", () => {
    const overdue = withDueDate(base, "2026-07-09");
    const completedSource = createDefaultState(today).tasks.at(-1);
    if (!completedSource) throw new Error("Expected a completed sample task");
    const completed = {
      ...completedSource,
      dueDate: "2026-07-08",
    };
    expect(sortTasksForList([completed, overdue], today).map((task) => task.id)).toEqual([
      overdue.id,
      completed.id,
    ]);
  });
});

describe("state validation and recovery", () => {
  test("accepts an exported state and rejects inconsistent completion data", () => {
    const state = createDefaultState();
    expect(validateAppState(state)).toBe(true);
    expect(
      validateAppState({
        ...state,
        tasks: [{ ...state.tasks[0], completedAt: new Date().toISOString() }],
      }),
    ).toBe(false);
  });

  test("preserves corrupt storage and immediately restores a valid default", () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    storage.setItem(STORAGE_KEY, "{not-json");

    const recovered = loadState();
    expect(recovered.tasks).toHaveLength(6);
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe("{not-json");
    const restoredPayload = storage.getItem(STORAGE_KEY);
    if (restoredPayload === null) throw new Error("Expected restored state in storage");
    expect(validateAppState(JSON.parse(restoredPayload))).toBe(true);
    expect(consumeCorruptStateRecovery()).toBe(true);
    expect(consumeCorruptStateRecovery()).toBe(false);
  });

  test("imports a valid JSON file and rejects an invalid one", async () => {
    const state = createDefaultState();
    const imported = await importState(
      new File([JSON.stringify(state)], "priority-board.json", { type: "application/json" }),
    );
    expect(imported.tasks).toHaveLength(6);

    await expect(
      importState(new File(["{}"], "not-a-board.json", { type: "application/json" })),
    ).rejects.toThrow("not a valid Priority Board export");
  });
});
