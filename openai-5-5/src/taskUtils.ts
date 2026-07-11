import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
import { DEFAULT_FILTERS, QUADRANT_META, QUADRANT_ORDER, STATUS_META, STATUS_ORDER } from "./constants";
import type { AppState, ListSortKey, QuadrantKey, SortDirection, Task, TaskFormValues, TaskStatus } from "./types";

export function getQuadrant(task: Task): QuadrantKey {
  if (task.urgent && task.important) return "doNow";
  if (!task.urgent && task.important) return "schedule";
  if (task.urgent && !task.important) return "delegate";
  return "eliminate";
}

export function getQuadrantLabel(quadrant: QuadrantKey): string {
  return QUADRANT_META[quadrant].label;
}

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_META[status].label;
}

export function normalizeTags(input: string | string[]): string[] {
  const pieces = Array.isArray(input) ? input.flatMap((tag) => tag.split(",")) : input.split(",");
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of pieces) {
    const tag = rawTag.trim();
    if (!tag) continue;

    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function isValidDateString(value: string): boolean {
  return parseLocalDate(value) !== null;
}

export function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return startOfDay(date);
}

function today(): Date {
  return startOfDay(new Date());
}

function isTaskDone(task: Task): boolean {
  return task.status === "done" || task.completedAt !== null;
}

export function isOverdue(task: Task): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  return Boolean(dueDate && !isTaskDone(task) && isBefore(dueDate, today()));
}

export function isDueToday(task: Task): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  return Boolean(dueDate && !isTaskDone(task) && isSameDay(dueDate, today()));
}

export function isDueWithinNext7Days(task: Task): boolean {
  const dueDate = parseLocalDate(task.dueDate);
  if (!dueDate || isTaskDone(task)) return false;

  const start = today();
  const daysAway = differenceInCalendarDays(dueDate, start);
  return isAfter(dueDate, start) && daysAway <= 7;
}

export function formatDueDate(task: Task): string {
  const dueDate = parseLocalDate(task.dueDate);
  if (!dueDate) return "";

  const start = today();
  const daysAway = differenceInCalendarDays(dueDate, start);

  if (isOverdue(task)) return "Overdue";
  if (isDueToday(task)) return "Today";
  if (!isTaskDone(task) && daysAway === 1) return "Tomorrow";
  if (!isTaskDone(task) && daysAway > 1 && daysAway <= 7) return format(dueDate, "MMM d");
  return format(dueDate, "MMM d, yyyy");
}

export function dueClassName(task: Task): string {
  if (isOverdue(task)) return "due-overdue";
  if (isDueToday(task)) return "due-today";
  if (isDueWithinNext7Days(task)) return "due-soon";
  return "due-normal";
}

function generateTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextSortOrder(tasks: Task[], status: TaskStatus): number {
  const currentMax = tasks
    .filter((task) => task.status === status)
    .reduce((max, task) => Math.max(max, task.sortOrder), 0);

  return currentMax + 1000;
}

export function createTask(input: TaskFormValues, existingTasks: Task[] = []): Task {
  const now = new Date().toISOString();
  const status = input.status || "todo";

  return {
    id: generateTaskId(),
    title: input.title.trim(),
    description: input.description.trim(),
    status,
    urgent: input.urgent,
    important: input.important,
    dueDate: input.dueDate || null,
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
    completedAt: status === "done" ? now : null,
    sortOrder: nextSortOrder(existingTasks, status),
  };
}

export function updateTask(task: Task, patch: Partial<TaskFormValues>): Task {
  const now = new Date().toISOString();
  const nextStatus = patch.status ?? task.status;
  let completedAt = task.completedAt;

  if (nextStatus === "done" && completedAt === null) {
    completedAt = now;
  }

  if (nextStatus !== "done") {
    completedAt = null;
  }

  return {
    ...task,
    ...patch,
    title: patch.title === undefined ? task.title : patch.title.trim(),
    description: patch.description === undefined ? task.description : patch.description.trim(),
    tags: patch.tags === undefined ? task.tags : normalizeTags(patch.tags),
    dueDate: patch.dueDate === undefined ? task.dueDate : patch.dueDate || null,
    status: nextStatus,
    completedAt,
    updatedAt: now,
  };
}

function matchesDueFilter(task: Task, dueFilter: AppState["filters"]["due"]): boolean {
  if (dueFilter === "all") return true;
  if (dueFilter === "overdue") return isOverdue(task);
  if (dueFilter === "today") return isDueToday(task);
  if (dueFilter === "next7") return isDueWithinNext7Days(task);
  return task.dueDate === null;
}

export function filterTasks(tasks: Task[], searchQuery: string, filters: AppState["filters"]): Task[] {
  const query = searchQuery.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    const quadrant = getQuadrant(task);
    const done = isTaskDone(task);
    const searchableText = [task.title, task.description, ...task.tags].join(" ").toLocaleLowerCase();

    if (query && !searchableText.includes(query)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.quadrants.length > 0 && !filters.quadrants.includes(quadrant)) return false;
    if (filters.tags.length > 0 && !filters.tags.some((tag) => task.tags.some((taskTag) => taskTag.toLocaleLowerCase() === tag.toLocaleLowerCase()))) {
      return false;
    }
    if (!matchesDueFilter(task, filters.due)) return false;
    if (filters.completion === "open" && done) return false;
    if (filters.completion === "done" && !done) return false;

    return true;
  });
}

function updatedTime(task: Task): number {
  return Date.parse(task.updatedAt) || 0;
}

function dueSortValue(task: Task): number {
  const date = parseLocalDate(task.dueDate);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function defaultDuePriority(task: Task): number {
  if (isTaskDone(task)) return 6;
  if (isOverdue(task)) return 0;
  if (isDueToday(task)) return 1;
  if (isDueWithinNext7Days(task)) return 2;
  if (task.dueDate) return 3;
  return 4;
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }

  return Number(a) - Number(b);
}

export function sortTasksForList(
  tasks: Task[],
  sortKey: ListSortKey = "default",
  direction: SortDirection = "asc",
): Task[] {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...tasks].sort((a, b) => {
    if (sortKey === "default") {
      return (
        Number(isTaskDone(a)) - Number(isTaskDone(b)) ||
        defaultDuePriority(a) - defaultDuePriority(b) ||
        Number(b.important) - Number(a.important) ||
        Number(b.urgent) - Number(a.urgent) ||
        updatedTime(b) - updatedTime(a)
      );
    }

    const valueByKey: Record<ListSortKey, [string | number, string | number]> = {
      default: [0, 0],
      dueDate: [dueSortValue(a), dueSortValue(b)],
      status: [STATUS_ORDER.indexOf(a.status), STATUS_ORDER.indexOf(b.status)],
      quadrant: [QUADRANT_ORDER.indexOf(getQuadrant(a)), QUADRANT_ORDER.indexOf(getQuadrant(b))],
      title: [a.title, b.title],
      updatedAt: [updatedTime(a), updatedTime(b)],
    };

    return compareValues(valueByKey[sortKey][0], valueByKey[sortKey][1]) * multiplier || updatedTime(b) - updatedTime(a);
  });
}

export function sortTasksForBoard(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || updatedTime(b) - updatedTime(a));
}

export function hasActiveFilters(filters: AppState["filters"]): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== DEFAULT_FILTERS.due ||
    filters.completion !== DEFAULT_FILTERS.completion
  );
}

export function createDefaultState(): AppState {
  const now = new Date();
  const todayString = format(now, "yyyy-MM-dd");
  const yesterdayString = format(subDays(now, 1), "yyyy-MM-dd");
  const soonString = format(addDays(now, 3), "yyyy-MM-dd");
  const laterString = format(addDays(now, 10), "yyyy-MM-dd");
  const base = new Date().toISOString();

  const sampleTasks: Task[] = [
    {
      id: "sample-clarify-scope",
      title: "Clarify project scope",
      description: "Confirm outcomes, constraints, and first delivery milestone.",
      status: "todo",
      urgent: true,
      important: true,
      dueDate: todayString,
      tags: ["Planning"],
      createdAt: base,
      updatedAt: base,
      completedAt: null,
      sortOrder: 1000,
    },
    {
      id: "sample-weekly-review",
      title: "Draft weekly review",
      description: "Summarize current priorities and capture decisions for next week.",
      status: "backlog",
      urgent: false,
      important: true,
      dueDate: laterString,
      tags: ["Review"],
      createdAt: base,
      updatedAt: base,
      completedAt: null,
      sortOrder: 1000,
    },
    {
      id: "sample-vendor-follow-up",
      title: "Reply to vendor follow-up",
      description: "Send a short reply and move the thread out of the inbox.",
      status: "todo",
      urgent: true,
      important: false,
      dueDate: yesterdayString,
      tags: ["Admin"],
      createdAt: base,
      updatedAt: base,
      completedAt: null,
      sortOrder: 2000,
    },
    {
      id: "sample-stale-bookmarks",
      title: "Remove stale bookmarks",
      description: "Clean out links that are no longer useful.",
      status: "backlog",
      urgent: false,
      important: false,
      dueDate: null,
      tags: ["Cleanup"],
      createdAt: base,
      updatedAt: base,
      completedAt: null,
      sortOrder: 2000,
    },
    {
      id: "sample-launch-checklist",
      title: "Prepare launch checklist",
      description: "Turn launch requirements into a clear sequence of checks.",
      status: "inProgress",
      urgent: false,
      important: true,
      dueDate: soonString,
      tags: ["Launch"],
      createdAt: base,
      updatedAt: base,
      completedAt: null,
      sortOrder: 1000,
    },
    {
      id: "sample-archive-notes",
      title: "Archive completed notes",
      description: "Move completed notes into the archive folder.",
      status: "done",
      urgent: false,
      important: false,
      dueDate: null,
      tags: ["Admin"],
      createdAt: base,
      updatedAt: base,
      completedAt: base,
      sortOrder: 1000,
    },
  ];

  return {
    version: 1,
    tasks: sampleTasks,
    activeView: "kanban",
    searchQuery: "",
    filters: DEFAULT_FILTERS,
  };
}
