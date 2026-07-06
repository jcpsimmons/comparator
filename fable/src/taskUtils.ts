import {
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { QUADRANT_LABELS, STATUS_LABELS } from "./constants";
import type {
  DropTarget,
  Filters,
  QuadrantKey,
  Task,
  TaskDraft,
  TaskStatus,
} from "./types";

export function getQuadrant(task: Task): QuadrantKey {
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
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function createTask(input: TaskDraft, existingTasks: Task[]): Task {
  const now = new Date().toISOString();
  const maxSortOrder = existingTasks.reduce((max, t) => Math.max(max, t.sortOrder), 0);
  return {
    id: generateId(),
    title: input.title,
    description: input.description,
    status: input.status,
    urgent: input.urgent,
    important: input.important,
    dueDate: input.dueDate,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === "done" ? now : null,
    sortOrder: maxSortOrder + 1,
  };
}

export function updateTask(task: Task, patch: Partial<Task>): Task {
  const next: Task = { ...task, ...patch, updatedAt: new Date().toISOString() };
  if (next.status === "done" && task.status !== "done" && next.completedAt === task.completedAt) {
    next.completedAt = new Date().toISOString();
  }
  if (next.status !== "done" && task.status === "done" && next.completedAt === task.completedAt) {
    next.completedAt = null;
  }
  return next;
}

function parseDueDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  const date = parseISO(task.dueDate);
  return isValid(date) ? date : null;
}

export function isOverdue(task: Task): boolean {
  const due = parseDueDate(task);
  if (!due || task.status === "done") return false;
  return isBefore(startOfDay(due), startOfDay(new Date()));
}

export function isDueToday(task: Task): boolean {
  const due = parseDueDate(task);
  if (!due || task.status === "done") return false;
  return isSameDay(due, new Date());
}

export function isDueWithinNext7Days(task: Task): boolean {
  const due = parseDueDate(task);
  if (!due) return false;
  const diff = differenceInCalendarDays(due, new Date());
  return diff > 0 && diff <= 7;
}

export function formatDueDate(task: Task): string {
  const due = parseDueDate(task);
  if (!due) return "";
  const diff = differenceInCalendarDays(due, new Date());
  if (diff < 0) {
    return task.status === "done" ? format(due, "MMM d, yyyy") : "Overdue";
  }
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return format(due, "EEE, MMM d");
  return format(due, "MMM d, yyyy");
}

export function filterTasks(tasks: Task[], searchQuery: string, filters: Filters): Task[] {
  const query = searchQuery.trim().toLowerCase();
  return tasks.filter((task) => {
    if (query) {
      const haystack = [task.title, task.description, ...task.tags].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }
    if (filters.quadrants.length > 0 && !filters.quadrants.includes(getQuadrant(task))) {
      return false;
    }
    if (filters.tags.length > 0) {
      const taskTags = task.tags.map((t) => t.toLowerCase());
      const hasTag = filters.tags.some((t) => taskTags.includes(t.toLowerCase()));
      if (!hasTag) return false;
    }
    switch (filters.due) {
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
        if (task.dueDate !== null) return false;
        break;
      case "all":
        break;
    }
    switch (filters.completion) {
      case "open":
        if (task.status === "done") return false;
        break;
      case "done":
        if (task.status !== "done") return false;
        break;
      case "all":
        break;
    }
    return true;
  });
}

function dueRank(task: Task): number {
  if (isOverdue(task)) return 0;
  if (isDueToday(task)) return 1;
  if (isDueWithinNext7Days(task)) return 2;
  return 3;
}

export function sortTasksForList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(a.status === "done") - Number(b.status === "done");
    if (doneDiff !== 0) return doneDiff;
    const dueDiff = dueRank(a) - dueRank(b);
    if (dueDiff !== 0) return dueDiff;
    const importantDiff = Number(b.important) - Number(a.important);
    if (importantDiff !== 0) return importantDiff;
    const urgentDiff = Number(b.urgent) - Number(a.urgent);
    if (urgentDiff !== 0) return urgentDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function sortByGroupOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function isInGroup(task: Task, target: DropTarget): boolean {
  if (target.type === "status") return task.status === target.value;
  return getQuadrant(task) === target.value;
}

/**
 * Move a task into a Kanban column or Matrix quadrant, optionally positioned
 * relative to the task it was dropped over. Returns a new tasks array.
 */
export function moveTask(
  tasks: Task[],
  activeId: string,
  target: DropTarget,
  overId: string | null
): Task[] {
  const active = tasks.find((t) => t.id === activeId);
  if (!active) return tasks;

  const groupWithActive = sortByGroupOrder(tasks.filter((t) => isInGroup(t, target)));
  const group = groupWithActive.filter((t) => t.id !== activeId);
  const wasInGroup = groupWithActive.some((t) => t.id === activeId);

  if (wasInGroup && (overId === null || overId === activeId)) {
    return tasks; // dropped back into its own group with no reorder target
  }

  let insertIndex = group.length;
  if (overId !== null && overId !== activeId) {
    const overIndex = group.findIndex((t) => t.id === overId);
    if (overIndex !== -1) {
      const origActiveIndex = groupWithActive.findIndex((t) => t.id === activeId);
      const origOverIndex = groupWithActive.findIndex((t) => t.id === overId);
      const movingDown = origActiveIndex !== -1 && origActiveIndex < origOverIndex;
      insertIndex = movingDown ? overIndex + 1 : overIndex;
    }
  }

  const prev = group[insertIndex - 1];
  const next = group[insertIndex];
  let sortOrder: number;
  if (!prev && !next) {
    sortOrder = 1;
  } else if (!prev) {
    sortOrder = next.sortOrder - 1;
  } else if (!next) {
    sortOrder = prev.sortOrder + 1;
  } else {
    sortOrder = (prev.sortOrder + next.sortOrder) / 2;
  }

  const patch: Partial<Task> =
    target.type === "status"
      ? { status: target.value, sortOrder }
      : { urgent: target.value === "doNow" || target.value === "delegate",
          important: target.value === "doNow" || target.value === "schedule",
          sortOrder };

  return tasks.map((t) => (t.id === activeId ? updateTask(t, patch) : t));
}
