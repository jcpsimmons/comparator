import {
  addDays,
  format,
  isBefore,
  isEqual,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  QUADRANT_FLAGS,
  QUADRANT_KEYS,
  QUADRANT_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
} from "./constants";
import type {
  CreateTaskInput,
  Filters,
  ListSortDir,
  ListSortKey,
  QuadrantKey,
  Task,
  TaskStatus,
} from "./types";

export function getQuadrant(task: Pick<Task, "urgent" | "important">): QuadrantKey {
  if (task.urgent && task.important) return "doNow";
  if (!task.urgent && task.important) return "schedule";
  if (task.urgent && !task.important) return "delegate";
  return "eliminate";
}

export function getQuadrantLabel(quadrant: QuadrantKey): string {
  return QUADRANT_LABELS[quadrant];
}

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status];
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTags(input: string | string[]): string[] {
  const parts = Array.isArray(input)
    ? input.flatMap((t) => t.split(","))
    : input.split(",");
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function createTask(
  input: CreateTaskInput,
  options?: { now?: Date; id?: string; existingMaxSortOrder?: number },
): Task {
  const now = options?.now ?? new Date();
  const iso = now.toISOString();
  const status = input.status ?? "todo";
  const title = input.title.trim();
  const sortOrder =
    input.sortOrder ??
    (options?.existingMaxSortOrder !== undefined
      ? options.existingMaxSortOrder + 1
      : 0);

  return {
    id: options?.id ?? generateId(),
    title,
    description: (input.description ?? "").trim(),
    status,
    urgent: input.urgent ?? false,
    important: input.important ?? false,
    dueDate: input.dueDate ?? null,
    tags: normalizeTags(input.tags ?? []),
    createdAt: iso,
    updatedAt: iso,
    completedAt: status === "done" ? iso : null,
    sortOrder,
  };
}

export function updateTask(
  task: Task,
  patch: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "status"
      | "urgent"
      | "important"
      | "dueDate"
      | "tags"
      | "sortOrder"
    >
  >,
  now = new Date(),
): Task {
  const next: Task = {
    ...task,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : task.title,
    description:
      patch.description !== undefined
        ? patch.description.trim()
        : task.description,
    tags: patch.tags !== undefined ? normalizeTags(patch.tags) : task.tags,
    updatedAt: now.toISOString(),
  };

  if (patch.status !== undefined) {
    if (patch.status === "done" && !task.completedAt) {
      next.completedAt = now.toISOString();
    } else if (patch.status !== "done") {
      next.completedAt = null;
    }
  }

  return next;
}

export function completeTask(task: Task, now = new Date()): Task {
  return {
    ...task,
    status: "done",
    completedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function reopenTask(task: Task, now = new Date()): Task {
  return {
    ...task,
    status: "todo",
    completedAt: null,
    updatedAt: now.toISOString(),
  };
}

export function toggleComplete(task: Task, now = new Date()): Task {
  if (task.status === "done" || task.completedAt) {
    return reopenTask(task, now);
  }
  return completeTask(task, now);
}

function parseLocalDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return startOfDay(d);
}

export function isOverdue(task: Pick<Task, "dueDate" | "status" | "completedAt">, today = new Date()): boolean {
  if (!task.dueDate) return false;
  if (task.status === "done" || task.completedAt) return false;
  const due = parseLocalDate(task.dueDate);
  if (!due) return false;
  return isBefore(due, startOfDay(today));
}

export function isDueToday(task: Pick<Task, "dueDate" | "status" | "completedAt">, today = new Date()): boolean {
  if (!task.dueDate) return false;
  if (task.status === "done" || task.completedAt) return false;
  const due = parseLocalDate(task.dueDate);
  if (!due) return false;
  return isEqual(due, startOfDay(today));
}

export function isDueWithinNext7Days(
  task: Pick<Task, "dueDate">,
  today = new Date(),
): boolean {
  if (!task.dueDate) return false;
  const due = parseLocalDate(task.dueDate);
  if (!due) return false;
  const start = startOfDay(today);
  const end = addDays(start, 7);
  return isBefore(start, due) && (isBefore(due, end) || isEqual(due, end));
}

export function formatDueDate(
  task: Pick<Task, "dueDate" | "status" | "completedAt">,
  today = new Date(),
): string | null {
  if (!task.dueDate) return null;
  const due = parseLocalDate(task.dueDate);
  if (!due) return null;

  if (isOverdue(task, today)) return "Overdue";
  if (isDueToday(task, today)) return "Today";

  const tomorrow = addDays(startOfDay(today), 1);
  if (isEqual(due, tomorrow)) return "Tomorrow";

  if (isDueWithinNext7Days(task, today)) {
    return format(due, "MMM d");
  }

  return format(due, "MMM d, yyyy");
}

export function getDueBadgeVariant(
  task: Pick<Task, "dueDate" | "status" | "completedAt">,
  today = new Date(),
): "overdue" | "today" | "soon" | "neutral" | null {
  if (!task.dueDate) return null;
  if (isOverdue(task, today)) return "overdue";
  if (isDueToday(task, today)) return "today";
  if (isDueWithinNext7Days(task, today)) return "soon";
  return "neutral";
}

function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (task.title.toLowerCase().includes(q)) return true;
  if (task.description.toLowerCase().includes(q)) return true;
  return task.tags.some((t) => t.toLowerCase().includes(q));
}

function matchesDueFilter(
  task: Task,
  due: Filters["due"],
  today: Date,
): boolean {
  switch (due) {
    case "all":
      return true;
    case "overdue":
      return isOverdue(task, today);
    case "today":
      return isDueToday(task, today);
    case "next7":
      return isDueWithinNext7Days(task, today);
    case "none":
      return !task.dueDate;
    default:
      return true;
  }
}

export function filterTasks(
  tasks: Task[],
  searchQuery: string,
  filters: Filters,
  today = new Date(),
): Task[] {
  return tasks.filter((task) => {
    if (!matchesSearch(task, searchQuery)) return false;

    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }

    if (filters.quadrants.length > 0) {
      const q = getQuadrant(task);
      if (!filters.quadrants.includes(q)) return false;
    }

    if (filters.tags.length > 0) {
      const tagSet = new Set(task.tags.map((t) => t.toLowerCase()));
      const hasTag = filters.tags.some((t) => tagSet.has(t.toLowerCase()));
      if (!hasTag) return false;
    }

    if (!matchesDueFilter(task, filters.due, today)) return false;

    if (filters.completion === "open") {
      if (task.status === "done" || task.completedAt) return false;
    } else if (filters.completion === "done") {
      if (task.status !== "done" && !task.completedAt) return false;
    }

    return true;
  });
}

function dueRank(task: Task, today: Date): number {
  if (task.status === "done" || task.completedAt) return 100;
  if (isOverdue(task, today)) return 0;
  if (isDueToday(task, today)) return 1;
  if (isDueWithinNext7Days(task, today)) return 2;
  if (task.dueDate) return 3;
  return 4;
}

export function sortTasksForList(
  tasks: Task[],
  sortKey: ListSortKey = "default",
  sortDir: ListSortDir = "asc",
  today = new Date(),
): Task[] {
  const dir = sortDir === "desc" ? -1 : 1;
  const copy = [...tasks];

  if (sortKey === "default") {
    copy.sort((a, b) => {
      const aDone = a.status === "done" || !!a.completedAt ? 1 : 0;
      const bDone = b.status === "done" || !!b.completedAt ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const dr = dueRank(a, today) - dueRank(b, today);
      if (dr !== 0) return dr;

      if (a.important !== b.important) return a.important ? -1 : 1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;

      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return copy;
  }

  copy.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status);
        break;
      case "quadrant":
        cmp =
          QUADRANT_KEYS.indexOf(getQuadrant(a)) -
          QUADRANT_KEYS.indexOf(getQuadrant(b));
        break;
      case "dueDate": {
        const ad = a.dueDate ?? "9999-99-99";
        const bd = b.dueDate ?? "9999-99-99";
        cmp = ad.localeCompare(bd);
        break;
      }
      case "updatedAt":
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
    }
    return cmp * dir;
  });

  return copy;
}

export function sortTasksInGroup(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function maxSortOrder(tasks: Task[]): number {
  if (tasks.length === 0) return -1;
  return Math.max(...tasks.map((t) => t.sortOrder));
}

export function applyKanbanDrop(
  tasks: Task[],
  taskId: string,
  targetStatus: TaskStatus,
  targetIndex: number,
  now = new Date(),
): Task[] {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;

  const othersInColumn = sortTasksInGroup(
    tasks.filter((t) => t.id !== taskId && t.status === targetStatus),
  );
  const clamped = Math.max(0, Math.min(targetIndex, othersInColumn.length));
  const reordered = [
    ...othersInColumn.slice(0, clamped),
    { ...moving, status: targetStatus },
    ...othersInColumn.slice(clamped),
  ];

  const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
  const iso = now.toISOString();

  return tasks.map((t) => {
    if (t.id === taskId) {
      const completedAt =
        targetStatus === "done" ? (t.completedAt ?? iso) : null;
      return {
        ...t,
        status: targetStatus,
        sortOrder: orderMap.get(t.id) ?? 0,
        completedAt,
        updatedAt: iso,
      };
    }
    if (orderMap.has(t.id)) {
      return { ...t, sortOrder: orderMap.get(t.id)!, updatedAt: iso };
    }
    return t;
  });
}

export function applyMatrixDrop(
  tasks: Task[],
  taskId: string,
  targetQuadrant: QuadrantKey,
  targetIndex: number,
  now = new Date(),
): Task[] {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;

  const flags = QUADRANT_FLAGS[targetQuadrant];
  const othersInQuad = sortTasksInGroup(
    tasks.filter(
      (t) => t.id !== taskId && getQuadrant(t) === targetQuadrant,
    ),
  );
  const clamped = Math.max(0, Math.min(targetIndex, othersInQuad.length));
  const reordered = [
    ...othersInQuad.slice(0, clamped),
    { ...moving, ...flags },
    ...othersInQuad.slice(clamped),
  ];

  const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
  const iso = now.toISOString();

  return tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        ...flags,
        sortOrder: orderMap.get(t.id) ?? 0,
        updatedAt: iso,
      };
    }
    if (orderMap.has(t.id)) {
      return { ...t, sortOrder: orderMap.get(t.id)!, updatedAt: iso };
    }
    return t;
  });
}

export function collectAllTags(tasks: Task[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const task of tasks) {
    for (const tag of task.tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export function isValidDueDateString(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISO(value);
  return isValid(d);
}

export function validateTaskFields(input: {
  title: string;
  description?: string;
  dueDate?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 120) return { ok: false, error: "Title must be at most 120 characters." };
  const desc = (input.description ?? "").trim();
  if (desc.length > 1000) {
    return { ok: false, error: "Description must be at most 1000 characters." };
  }
  if (!isValidDueDateString(input.dueDate ?? null)) {
    return { ok: false, error: "Due date must be a valid date." };
  }
  return { ok: true };
}
