import {
  isAfter,
  isBefore,
  isSameDay,
  format,
  differenceInCalendarDays,
} from "date-fns";
import {
  QUADRANT_LABELS,
  STATUS_LABELS,
  makeId,
} from "./constants";
import type {
  AppState,
  Filters,
  QuadrantKey,
  Task,
  TaskInput,
  TaskStatus,
} from "./types";

export function getQuadrant(task: Task): QuadrantKey {
  if (task.urgent && task.important) return "doNow";
  if (!task.urgent && task.important) return "schedule";
  if (task.urgent && !task.important) return "delegate";
  return "eliminate";
}

export function getQuadrantLabel(q: QuadrantKey): string {
  return QUADRANT_LABELS[q];
}

export function getStatusLabel(s: TaskStatus): string {
  return STATUS_LABELS[s];
}

export function createTask(input: TaskInput, maxSortOrder: number): Task {
  const now = new Date().toISOString();
  const status = input.status;
  const isDone = status === "done";
  return {
    id: makeId(),
    title: input.title.trim(),
    description: input.description.trim(),
    status,
    urgent: input.urgent,
    important: input.important,
    dueDate: input.dueDate && input.dueDate.length > 0 ? input.dueDate : null,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    completedAt: isDone ? now : null,
    sortOrder: maxSortOrder + 1,
  };
}

export function updateTask(task: Task, patch: Partial<Task>): Task {
  const next: Task = { ...task, ...patch, updatedAt: new Date().toISOString() };
  if (next.status === "done" && next.completedAt === null) {
    next.completedAt = new Date().toISOString();
  }
  if (next.status !== "done") {
    next.completedAt = null;
  }
  return next;
}

export function toggleComplete(task: Task): Task {
  if (task.status === "done") {
    return updateTask(task, { status: "todo", completedAt: null });
  }
  return updateTask(task, { status: "done" });
}

export function normalizeTags(input: string): string[] {
  if (!input) return [];
  const parts = input.split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function collectAllTags(tasks: Task[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tasks) {
    for (const tag of t.tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/* ---------- Due date helpers (local dates, not UTC) ---------- */

function startOfLocalToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDueDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  try {
    // YYYY-MM-DD -> parse as local date
    const [y, m, d] = task.dueDate.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;
    const local = new Date(y, m - 1, d);
    if (isNaN(local.getTime())) return null;
    return local;
  } catch {
    return null;
  }
}

export function isOverdue(task: Task): boolean {
  if (task.status === "done") return false;
  const due = parseDueDate(task);
  if (!due) return false;
  return isBefore(due, startOfLocalToday());
}

export function isDueToday(task: Task): boolean {
  if (task.status === "done") return false;
  const due = parseDueDate(task);
  if (!due) return false;
  return isSameDay(due, startOfLocalToday());
}

export function isDueWithinNext7Days(task: Task): boolean {
  if (task.status === "done") return false;
  const due = parseDueDate(task);
  if (!due) return false;
  const today = startOfLocalToday();
  if (!isAfter(due, today) && !isSameDay(due, today)) return false;
  const diff = differenceInCalendarDays(due, today);
  return diff >= 0 && diff <= 7;
}

function isDueTomorrow(task: Task): boolean {
  if (task.status === "done") return false;
  const due = parseDueDate(task);
  if (!due) return false;
  const tomorrow = new Date(startOfLocalToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(due, tomorrow);
}

export function hasNoDueDate(task: Task): boolean {
  return !task.dueDate;
}

export function formatDueDate(task: Task): string {
  if (!task.dueDate) return "";
  const due = parseDueDate(task);
  if (!due) return "";
  const today = startOfLocalToday();
  if (isOverdue(task)) return "Overdue";
  if (isDueToday(task)) return "Today";
  if (isDueTomorrow(task)) return "Tomorrow";
  const diff = differenceInCalendarDays(due, today);
  if (diff > 1 && diff <= 7) {
    return format(due, "EEE MMM d");
  }
  return format(due, "MMM d, yyyy");
}

/* ---------- Filtering ---------- */

function matchesSearch(task: Task, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (task.title.toLowerCase().includes(q)) return true;
  if (task.description.toLowerCase().includes(q)) return true;
  for (const tag of task.tags) {
    if (tag.toLowerCase().includes(q)) return true;
  }
  return false;
}

function matchesFilters(task: Task, filters: Filters): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(task.status))
    return false;
  if (filters.quadrants.length > 0) {
    if (!filters.quadrants.includes(getQuadrant(task))) return false;
  }
  if (filters.tags.length > 0) {
    const lower = task.tags.map((t) => t.toLowerCase());
    const ok = filters.tags.every((t) => lower.includes(t.toLowerCase()));
    if (!ok) return false;
  }
  switch (filters.due) {
    case "all":
      break;
    case "overdue":
      if (!isOverdue(task)) return false;
      break;
    case "today":
      if (!isDueToday(task)) return false;
      break;
    case "next7":
      if (!isDueWithinNext7Days(task)) return false;
      break;
    case "none":
      if (!hasNoDueDate(task)) return false;
      break;
  }
  switch (filters.completion) {
    case "all":
      break;
    case "open":
      if (task.status === "done") return false;
      break;
    case "done":
      if (task.status !== "done") return false;
      break;
  }
  return true;
}

export function filterTasks(
  tasks: Task[],
  searchQuery: string,
  filters: Filters
): Task[] {
  const q = searchQuery.trim();
  return tasks.filter(
    (t) => matchesSearch(t, q) && matchesFilters(t, filters)
  );
}

/* ---------- Sorting ---------- */

export type ListSortKey =
  | "due"
  | "status"
  | "quadrant"
  | "title"
  | "updated";

export function sortTasksForList(
  tasks: Task[],
  sortKey: ListSortKey = "due",
  ascending: boolean = true
): Task[] {
  const sign = ascending ? 1 : -1;
  const copy = [...tasks];
  if (sortKey === "due") {
    copy.sort((a, b) => sign * defaultListCompare(a, b));
  } else if (sortKey === "status") {
    copy.sort(
      (a, b) =>
        sign *
        (a.status.localeCompare(b.status) || defaultListCompare(a, b))
    );
  } else if (sortKey === "quadrant") {
    copy.sort(
      (a, b) =>
        sign *
        (getQuadrant(a).localeCompare(getQuadrant(b)) ||
          defaultListCompare(a, b))
    );
  } else if (sortKey === "title") {
    copy.sort(
      (a, b) =>
        sign *
        (a.title.localeCompare(b.title) || defaultListCompare(a, b))
    );
  } else if (sortKey === "updated") {
    copy.sort(
      (a, b) =>
        sign *
        (b.updatedAt.localeCompare(a.updatedAt) ||
          defaultListCompare(a, b))
    );
  }
  return copy;
}

function defaultListCompare(a: Task, b: Task): number {
  // Open before done
  const aDone = a.status === "done" ? 1 : 0;
  const bDone = b.status === "done" ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;
  // Overdue first
  const aOver = isOverdue(a) ? 0 : 1;
  const bOver = isOverdue(b) ? 0 : 1;
  if (aOver !== bOver) return aOver - bOver;
  // Due today
  const aToday = isDueToday(a) ? 0 : 1;
  const bToday = isDueToday(b) ? 0 : 1;
  if (aToday !== bToday) return aToday - bToday;
  // Due soon
  const aSoon = isDueWithinNext7Days(a) ? 0 : 1;
  const bSoon = isDueWithinNext7Days(b) ? 0 : 1;
  if (aSoon !== bSoon) return aSoon - bSoon;
  // Important
  const aImp = a.important ? 0 : 1;
  const bImp = b.important ? 0 : 1;
  if (aImp !== bImp) return aImp - bImp;
  // Urgent
  const aUrg = a.urgent ? 0 : 1;
  const bUrg = b.urgent ? 0 : 1;
  if (aUrg !== bUrg) return aUrg - bUrg;
  // Updated newest first
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function sortTasksForColumn(tasks: Task[]): Task[] {
  const copy = [...tasks];
  copy.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return copy;
}

export function maxSortOrder(tasks: Task[]): number {
  let max = -1;
  for (const t of tasks) {
    if (t.sortOrder > max) max = t.sortOrder;
  }
  return max;
}

export function recomputeSortOrder(
  tasks: Task[],
  groupingFn: (t: Task) => string
): Task[] {
  // Recompute sortOrder sequentially within each group
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = groupingFn(t);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  const out: Task[] = [];
  for (const arr of groups.values()) {
    const sorted = sortTasksForColumn(arr);
    sorted.forEach((t, idx) => {
      out.push({ ...t, sortOrder: idx });
    });
  }
  return out;
}

export function moveTaskToColumn(
  state: AppState,
  taskId: string,
  targetStatus: TaskStatus,
  targetIndex: number | null
): AppState {
  const tasks = state.tasks.map((t) => ({ ...t }));
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const fromStatus = task.status;
  task.status = targetStatus;
  task.updatedAt = new Date().toISOString();
  if (targetStatus === "done" && task.completedAt === null) {
    task.completedAt = new Date().toISOString();
  }
  if (targetStatus !== "done") {
    task.completedAt = null;
  }

  // Recompute sortOrder within the target column
  const targetTasks = tasks
    .filter((t) => t.id !== taskId && t.status === targetStatus)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (targetIndex === null || targetIndex >= targetTasks.length) {
    task.sortOrder =
      targetTasks.length > 0
        ? targetTasks[targetTasks.length - 1].sortOrder + 1
        : 0;
  } else {
    // Insert at target index: shift others down
    const insertAt = targetTasks[targetIndex].sortOrder;
    targetTasks.forEach((t, idx) => {
      if (idx >= targetIndex) {
        const other = tasks.find((x) => x.id === t.id);
        if (other) other.sortOrder = other.sortOrder + 1;
      }
    });
    task.sortOrder = insertAt;
  }

  // Renormalize sort orders within from and target columns
  const recompute = (status: TaskStatus) => {
    const col = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    col.forEach((t, idx) => {
      t.sortOrder = idx;
    });
  };
  if (fromStatus !== targetStatus) {
    recompute(fromStatus);
  }
  recompute(targetStatus);

  return { ...state, tasks };
}

export function moveTaskToQuadrant(
  state: AppState,
  taskId: string,
  targetQuadrant: QuadrantKey
): AppState {
  const tasks = state.tasks.map((t) => ({ ...t }));
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const flags =
    targetQuadrant === "doNow"
      ? { urgent: true, important: true }
      : targetQuadrant === "schedule"
        ? { urgent: false, important: true }
        : targetQuadrant === "delegate"
          ? { urgent: true, important: false }
          : { urgent: false, important: false };
  const changed =
    task.urgent !== flags.urgent || task.important !== flags.important;
  task.urgent = flags.urgent;
  task.important = flags.important;
  task.updatedAt = new Date().toISOString();

  // Recompute sortOrder within target quadrant
  const targetTasks = tasks
    .filter(
      (t) =>
        t.id !== taskId &&
        getQuadrant(t) === targetQuadrant
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  task.sortOrder =
    targetTasks.length > 0
      ? targetTasks[targetTasks.length - 1].sortOrder + 1
      : 0;

  if (!changed) {
    // Still bump updatedAt for reorder
  }
  return { ...state, tasks };
}
