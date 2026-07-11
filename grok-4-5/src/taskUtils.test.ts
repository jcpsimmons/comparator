import { describe, expect, it } from "vitest";
import {
  applyKanbanDrop,
  applyMatrixDrop,
  completeTask,
  createTask,
  filterTasks,
  formatDueDate,
  getQuadrant,
  isDueToday,
  isDueWithinNext7Days,
  isOverdue,
  normalizeTags,
  reopenTask,
  sortTasksForList,
  updateTask,
  validateTaskFields,
} from "./taskUtils";
import { QUADRANT_FLAGS } from "./constants";
import type { Filters, Task } from "./types";

const baseFilters: Filters = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = "2026-07-10T12:00:00.000Z";
  return {
    id: overrides.id ?? "t1",
    title: overrides.title ?? "Task",
    description: overrides.description ?? "",
    status: overrides.status ?? "todo",
    urgent: overrides.urgent ?? false,
    important: overrides.important ?? false,
    dueDate: overrides.dueDate ?? null,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    completedAt: overrides.completedAt ?? null,
    sortOrder: overrides.sortOrder ?? 0,
  };
}

describe("getQuadrant", () => {
  it("maps urgent×important flags to quadrants", () => {
    expect(getQuadrant({ urgent: true, important: true })).toBe("doNow");
    expect(getQuadrant({ urgent: false, important: true })).toBe("schedule");
    expect(getQuadrant({ urgent: true, important: false })).toBe("delegate");
    expect(getQuadrant({ urgent: false, important: false })).toBe("eliminate");
  });

  it("quadrant flags reverse-map correctly", () => {
    for (const key of Object.keys(QUADRANT_FLAGS) as Array<keyof typeof QUADRANT_FLAGS>) {
      const flags = QUADRANT_FLAGS[key];
      expect(getQuadrant(flags)).toBe(key);
    }
  });
});

describe("normalizeTags", () => {
  it("trims, drops empties, dedupes case-insensitively preserving first casing", () => {
    expect(normalizeTags("  Alpha, beta, ALPHA, , Gamma ")).toEqual([
      "Alpha",
      "beta",
      "Gamma",
    ]);
    expect(normalizeTags(["One", "one", "Two"])).toEqual(["One", "Two"]);
  });
});

describe("createTask / updateTask / complete / reopen", () => {
  const fixed = new Date("2026-07-10T15:30:00.000Z");

  it("createTask defaults to todo, sets timestamps, null completedAt", () => {
    const t = createTask(
      { title: "  Hello  ", description: " desc ", tags: ["A", "a"] },
      { now: fixed, id: "fixed-id", existingMaxSortOrder: 2 },
    );
    expect(t.id).toBe("fixed-id");
    expect(t.title).toBe("Hello");
    expect(t.description).toBe("desc");
    expect(t.status).toBe("todo");
    expect(t.completedAt).toBeNull();
    expect(t.createdAt).toBe(fixed.toISOString());
    expect(t.updatedAt).toBe(fixed.toISOString());
    expect(t.sortOrder).toBe(3);
    expect(t.tags).toEqual(["A"]);
  });

  it("createTask with done status sets completedAt", () => {
    const t = createTask({ title: "Done one", status: "done" }, { now: fixed });
    expect(t.status).toBe("done");
    expect(t.completedAt).toBe(fixed.toISOString());
  });

  it("updateTask updates fields and completedAt on status transitions", () => {
    const open = makeTask({ status: "todo", completedAt: null });
    const done = updateTask(open, { status: "done" }, fixed);
    expect(done.status).toBe("done");
    expect(done.completedAt).toBe(fixed.toISOString());
    expect(done.updatedAt).toBe(fixed.toISOString());

    const reopened = updateTask(done, { status: "todo" }, fixed);
    expect(reopened.status).toBe("todo");
    expect(reopened.completedAt).toBeNull();
  });

  it("completeTask and reopenTask follow SPEC rules", () => {
    const t = makeTask({ status: "inProgress" });
    const done = completeTask(t, fixed);
    expect(done.status).toBe("done");
    expect(done.completedAt).toBe(fixed.toISOString());
    const open = reopenTask(done, fixed);
    expect(open.status).toBe("todo");
    expect(open.completedAt).toBeNull();
  });
});

describe("due date helpers", () => {
  const today = new Date(2026, 6, 10); // local July 10, 2026

  it("isOverdue uses local dates and ignores done tasks", () => {
    expect(isOverdue(makeTask({ dueDate: "2026-07-09" }), today)).toBe(true);
    expect(isOverdue(makeTask({ dueDate: "2026-07-10" }), today)).toBe(false);
    expect(
      isOverdue(
        makeTask({ dueDate: "2026-07-09", status: "done", completedAt: "2026-07-09T00:00:00.000Z" }),
        today,
      ),
    ).toBe(false);
  });

  it("isDueToday and isDueWithinNext7Days", () => {
    expect(isDueToday(makeTask({ dueDate: "2026-07-10" }), today)).toBe(true);
    expect(isDueToday(makeTask({ dueDate: "2026-07-11" }), today)).toBe(false);
    expect(isDueWithinNext7Days(makeTask({ dueDate: "2026-07-11" }), today)).toBe(true);
    expect(isDueWithinNext7Days(makeTask({ dueDate: "2026-07-17" }), today)).toBe(true);
    expect(isDueWithinNext7Days(makeTask({ dueDate: "2026-07-18" }), today)).toBe(false);
    expect(isDueWithinNext7Days(makeTask({ dueDate: "2026-07-10" }), today)).toBe(false);
  });

  it("formatDueDate labels", () => {
    expect(formatDueDate(makeTask({ dueDate: "2026-07-09" }), today)).toBe("Overdue");
    expect(formatDueDate(makeTask({ dueDate: "2026-07-10" }), today)).toBe("Today");
    expect(formatDueDate(makeTask({ dueDate: "2026-07-11" }), today)).toBe("Tomorrow");
    expect(formatDueDate(makeTask({ dueDate: null }), today)).toBeNull();
  });
});

describe("filterTasks", () => {
  const today = new Date(2026, 6, 10);
  const tasks = [
    makeTask({
      id: "1",
      title: "Planning doc",
      description: "Write the scope",
      tags: ["Planning"],
      status: "todo",
      urgent: true,
      important: true,
      dueDate: "2026-07-09",
    }),
    makeTask({
      id: "2",
      title: "Cleanup",
      description: "Remove clutter",
      tags: ["Admin"],
      status: "done",
      completedAt: "2026-07-01T00:00:00.000Z",
      urgent: false,
      important: false,
      dueDate: "2026-07-01",
    }),
    makeTask({
      id: "3",
      title: "Vendor email",
      description: "Follow up",
      tags: ["Admin"],
      status: "todo",
      urgent: true,
      important: false,
      dueDate: "2026-07-12",
    }),
  ];

  it("searches title, description, tags case-insensitively", () => {
    expect(filterTasks(tasks, "planning", baseFilters, today).map((t) => t.id)).toEqual(["1"]);
    expect(filterTasks(tasks, "SCOPE", baseFilters, today).map((t) => t.id)).toEqual(["1"]);
    expect(filterTasks(tasks, "admin", baseFilters, today).map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("filters by status, quadrant, tags, due, completion", () => {
    expect(
      filterTasks(tasks, "", { ...baseFilters, statuses: ["done"] }, today).map((t) => t.id),
    ).toEqual(["2"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, quadrants: ["doNow"] }, today).map((t) => t.id),
    ).toEqual(["1"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, tags: ["Planning"] }, today).map((t) => t.id),
    ).toEqual(["1"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, due: "overdue" }, today).map((t) => t.id),
    ).toEqual(["1"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, due: "next7" }, today).map((t) => t.id),
    ).toEqual(["3"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, completion: "open" }, today).map((t) => t.id),
    ).toEqual(["1", "3"]);
    expect(
      filterTasks(tasks, "", { ...baseFilters, completion: "done" }, today).map((t) => t.id),
    ).toEqual(["2"]);
  });
});

describe("sortTasksForList", () => {
  const today = new Date(2026, 6, 10);

  it("default: open before done, overdue first, then importance/urgency, newest updated", () => {
    const tasks = [
      makeTask({
        id: "done",
        status: "done",
        completedAt: "2026-07-01T00:00:00.000Z",
        dueDate: "2026-07-01",
        important: true,
        urgent: true,
        updatedAt: "2026-07-10T10:00:00.000Z",
      }),
      makeTask({
        id: "later",
        dueDate: "2026-08-01",
        important: false,
        urgent: false,
        updatedAt: "2026-07-10T09:00:00.000Z",
      }),
      makeTask({
        id: "overdue",
        dueDate: "2026-07-01",
        important: false,
        urgent: false,
        updatedAt: "2026-07-10T08:00:00.000Z",
      }),
      makeTask({
        id: "today-imp",
        dueDate: "2026-07-10",
        important: true,
        urgent: false,
        updatedAt: "2026-07-10T07:00:00.000Z",
      }),
    ];
    const sorted = sortTasksForList(tasks, "default", "asc", today).map((t) => t.id);
    expect(sorted).toEqual(["overdue", "today-imp", "later", "done"]);
  });
});

describe("drag helpers", () => {
  const now = new Date("2026-07-10T12:00:00.000Z");

  it("applyKanbanDrop updates status and sortOrder", () => {
    const tasks = [
      makeTask({ id: "a", status: "todo", sortOrder: 0 }),
      makeTask({ id: "b", status: "inProgress", sortOrder: 0 }),
    ];
    const next = applyKanbanDrop(tasks, "a", "inProgress", 1, now);
    const moved = next.find((t) => t.id === "a")!;
    expect(moved.status).toBe("inProgress");
    expect(moved.updatedAt).toBe(now.toISOString());
    expect(moved.sortOrder).toBe(1);
  });

  it("applyMatrixDrop updates urgent/important flags", () => {
    const tasks = [makeTask({ id: "a", urgent: false, important: false, sortOrder: 0 })];
    const next = applyMatrixDrop(tasks, "a", "doNow", 0, now);
    const moved = next.find((t) => t.id === "a")!;
    expect(moved.urgent).toBe(true);
    expect(moved.important).toBe(true);
    expect(getQuadrant(moved)).toBe("doNow");
  });
});

describe("validateTaskFields", () => {
  it("requires title and enforces max lengths", () => {
    expect(validateTaskFields({ title: "  " }).ok).toBe(false);
    expect(validateTaskFields({ title: "Ok" }).ok).toBe(true);
    expect(validateTaskFields({ title: "x".repeat(121) }).ok).toBe(false);
    expect(validateTaskFields({ title: "Ok", description: "y".repeat(1001) }).ok).toBe(false);
  });
});
