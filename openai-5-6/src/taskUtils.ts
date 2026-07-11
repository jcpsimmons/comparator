import {
  addDays,
  format,
  isAfter,
  isBefore,
  isEqual,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { QUADRANT_LABELS, STATUS_LABELS } from "./constants";
import type { QuadrantKey, Task, TaskFilters, TaskInput, TaskPatch, TaskStatus } from "./types";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * Normalizes comma-separated input or an existing array. Empty values are
 * removed and duplicates are compared case-insensitively while preserving the
 * first spelling entered.
 */
export function normalizeTags(input: string | readonly string[]): string[] {
  const candidates = (typeof input === "string" ? [input] : input).flatMap((value) =>
    value.split(","),
  );
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const candidate of candidates) {
    const tag = candidate.trim();
    const key = tag.toLowerCase();
    if (tag.length === 0 || seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

function parseLocalDate(value: string | null): Date | null {
  if (value === null || !LOCAL_DATE_PATTERN.test(value)) return null;

  const date = parseISO(value);
  if (!isValid(date) || format(date, "yyyy-MM-dd") !== value) return null;

  return startOfDay(date);
}

export function isValidDueDate(value: string): boolean {
  return parseLocalDate(value) !== null;
}

function localToday(today: Date): Date {
  return startOfDay(today);
}

function isOpen(task: Pick<Task, "status">): boolean {
  return task.status !== "done";
}

export function isOverdue(
  task: Pick<Task, "dueDate" | "status">,
  today: Date = new Date(),
): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  return isOpen(task) && dueDate !== null && isBefore(dueDate, localToday(today));
}

export function isDueToday(
  task: Pick<Task, "dueDate" | "status">,
  today: Date = new Date(),
): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  return isOpen(task) && dueDate !== null && isEqual(dueDate, localToday(today));
}

export function isDueWithinNext7Days(
  task: Pick<Task, "dueDate" | "status">,
  today: Date = new Date(),
): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  const start = localToday(today);

  return dueDate !== null && isAfter(dueDate, start) && !isAfter(dueDate, addDays(start, 7));
}

/** Returns an empty string for tasks without a valid due date. */
export function formatDueDate(
  task: Pick<Task, "dueDate" | "status">,
  today: Date = new Date(),
): string {
  const dueDate = parseLocalDate(task.dueDate);
  if (dueDate === null) return "";

  const start = localToday(today);
  if (isOverdue(task, start)) return "Overdue";
  if (isDueToday(task, start)) return "Today";
  if (isEqual(dueDate, addDays(start, 1))) return "Tomorrow";
  if (isDueWithinNext7Days(task, start)) return format(dueDate, "MMM d");

  return format(dueDate, "MMM d, yyyy");
}

function validateTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length === 0) throw new Error("Title is required.");
  if (normalized.length > 120) {
    throw new Error("Title must be 120 characters or fewer.");
  }
  return normalized;
}

function validateDescription(description: string): string {
  const normalized = description.trim();
  if (normalized.length > 1000) {
    throw new Error("Description must be 1000 characters or fewer.");
  }
  return normalized;
}

function validateDueDate(dueDate: string | null | undefined): string | null {
  if (dueDate === undefined || dueDate === null || dueDate.trim() === "") {
    return null;
  }

  const normalized = dueDate.trim();
  if (!isValidDueDate(normalized)) {
    throw new Error("Due date must be a valid date.");
  }
  return normalized;
}

function generateTaskId(now: Date): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `task-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextSortOrder(tasks: readonly Task[], status: TaskStatus): number {
  const orders = tasks
    .filter((task) => task.status === status && Number.isFinite(task.sortOrder))
    .map((task) => task.sortOrder);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export function createTask(
  input: TaskInput,
  tasks: readonly Task[] = [],
  now: Date = new Date(),
): Task {
  const status = input.status ?? "todo";
  const timestamp = now.toISOString();

  return {
    id: generateTaskId(now),
    title: validateTitle(input.title),
    description: validateDescription(input.description ?? ""),
    status,
    urgent: input.urgent ?? false,
    important: input.important ?? false,
    dueDate: validateDueDate(input.dueDate),
    tags: normalizeTags(input.tags ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: status === "done" ? timestamp : null,
    sortOrder: nextSortOrder(tasks, status),
  };
}

export function updateTask(task: Task, patch: TaskPatch, now: Date = new Date()): Task {
  const nextStatus = patch.status ?? task.status;
  const statusChanged = nextStatus !== task.status;
  let completedAt = task.completedAt;

  if (statusChanged && nextStatus === "done" && completedAt === null) {
    completedAt = now.toISOString();
  } else if (statusChanged && nextStatus !== "done") {
    completedAt = null;
  }

  if (patch.sortOrder !== undefined && !Number.isFinite(patch.sortOrder)) {
    throw new Error("Sort order must be a finite number.");
  }

  return {
    ...task,
    ...patch,
    title: patch.title === undefined ? task.title : validateTitle(patch.title),
    description:
      patch.description === undefined ? task.description : validateDescription(patch.description),
    status: nextStatus,
    dueDate: patch.dueDate === undefined ? task.dueDate : validateDueDate(patch.dueDate),
    tags: patch.tags === undefined ? task.tags : normalizeTags(patch.tags),
    updatedAt: now.toISOString(),
    completedAt,
  };
}

export function toggleTaskCompletion(task: Task, now: Date = new Date()): Task {
  return updateTask(task, { status: task.status === "done" ? "todo" : "done" }, now);
}

export function filterTasks(
  tasks: readonly Task[],
  searchQuery: string,
  filters: TaskFilters,
): Task[] {
  const query = searchQuery.trim().toLowerCase();
  const selectedTags = new Set(filters.tags.map((tag) => tag.trim().toLowerCase()));

  return tasks.filter((task) => {
    if (query.length > 0) {
      const searchValues = [task.title, task.description, ...task.tags];
      if (!searchValues.some((value) => value.toLowerCase().includes(query))) {
        return false;
      }
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }

    if (filters.quadrants.length > 0 && !filters.quadrants.includes(getQuadrant(task))) {
      return false;
    }

    if (selectedTags.size > 0 && !task.tags.some((tag) => selectedTags.has(tag.toLowerCase()))) {
      return false;
    }

    if (filters.completion === "open" && task.status === "done") return false;
    if (filters.completion === "done" && task.status !== "done") return false;

    switch (filters.due) {
      case "overdue":
        return isOverdue(task);
      case "today":
        return isDueToday(task);
      case "next7":
        return isDueWithinNext7Days(task);
      case "none":
        return task.dueDate === null;
      case "all":
        return true;
      default:
        return true;
    }
  });
}

function duePriority(task: Task, today: Date): number {
  if (isOverdue(task, today)) return 0;
  if (isDueToday(task, today)) return 1;
  if (isDueWithinNext7Days(task, today)) return 2;
  return 3;
}

/** Sorts a copy using the List View's complete default priority sequence. */
export function sortTasksForList(tasks: readonly Task[], today: Date = new Date()): Task[] {
  return [...tasks].sort((left, right) => {
    const completionDifference = Number(left.status === "done") - Number(right.status === "done");
    if (completionDifference !== 0) return completionDifference;

    const dueDifference = duePriority(left, today) - duePriority(right, today);
    if (dueDifference !== 0) return dueDifference;

    const importanceDifference = Number(right.important) - Number(left.important);
    if (importanceDifference !== 0) return importanceDifference;

    const urgencyDifference = Number(right.urgent) - Number(left.urgent);
    if (urgencyDifference !== 0) return urgencyDifference;

    const updatedDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;

    return left.title.localeCompare(right.title);
  });
}

/** Sorts a copy for Kanban columns and Matrix quadrants. */
export function sortTasksByOrder(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const orderDifference = left.sortOrder - right.sortOrder;
    if (orderDifference !== 0) return orderDifference;

    const updatedDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;

    return left.id.localeCompare(right.id);
  });
}
