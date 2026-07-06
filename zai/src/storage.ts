import {
  CORRUPT_BACKUP_KEY,
  createDefaultState,
  makeId,
  STORAGE_KEY,
} from "./constants";
import { createDefaultFilters } from "./constants";
import type {
  AppView,
  AppState,
  DueFilter,
  CompletionFilter,
  Filters,
  QuadrantKey,
  Task,
  TaskStatus,
} from "./types";

const VALID_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "inProgress",
  "done",
];
const VALID_QUADRANTS: QuadrantKey[] = [
  "doNow",
  "schedule",
  "delegate",
  "eliminate",
];
const VALID_VIEWS: AppView[] = ["kanban", "matrix", "list"];
const VALID_DUE: DueFilter[] = ["all", "overdue", "today", "next7", "none"];
const VALID_COMPLETION: CompletionFilter[] = ["all", "open", "done"];

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isArrayOfStrings(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isStatus(v: unknown): v is TaskStatus {
  return isString(v) && (VALID_STATUSES as string[]).includes(v);
}

function isQuadrant(v: unknown): v is QuadrantKey {
  return isString(v) && (VALID_QUADRANTS as string[]).includes(v);
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    isString(t.id) &&
    isString(t.title) &&
    isString(t.description) &&
    isStatus(t.status) &&
    isBoolean(t.urgent) &&
    isBoolean(t.important) &&
    (t.dueDate === null || isString(t.dueDate)) &&
    isArrayOfStrings(t.tags) &&
    isString(t.createdAt) &&
    isString(t.updatedAt) &&
    (t.completedAt === null || isString(t.completedAt)) &&
    typeof t.sortOrder === "number"
  );
}

function isFilters(value: unknown): value is Filters {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    Array.isArray(f.statuses) &&
    f.statuses.every((s) => isStatus(s)) &&
    Array.isArray(f.quadrants) &&
    f.quadrants.every((q) => isQuadrant(q)) &&
    Array.isArray(f.tags) &&
    f.tags.every((t) => typeof t === "string") &&
    (typeof f.due === "string" && (VALID_DUE as string[]).includes(f.due)) &&
    (typeof f.completion === "string" &&
      (VALID_COMPLETION as string[]).includes(f.completion))
  );
}

export function validateAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    s.version === 1 &&
    Array.isArray(s.tasks) &&
    s.tasks.every(isTask) &&
    (typeof s.activeView === "string" &&
      (VALID_VIEWS as string[]).includes(s.activeView)) &&
    typeof s.searchQuery === "string" &&
    isFilters(s.filters)
  );
}

/**
 * Sanitize/normalize an arbitrary value into a valid AppState, mutating
 * fields where necessary. Returns null if the top-level shape is unusable.
 */
export function coerceAppState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (s.version !== 1) return null;
  if (!Array.isArray(s.tasks)) return null;

  const tasks: Task[] = (s.tasks as unknown[])
    .filter(isTask)
    .map((t) => ({ ...t }));

  const activeView: AppView = isString(s.activeView) &&
  (VALID_VIEWS as string[]).includes(s.activeView)
    ? (s.activeView as AppView)
    : "kanban";

  const searchQuery = isString(s.searchQuery) ? s.searchQuery : "";

  const filters: Filters = isFilters(s.filters)
    ? {
        statuses: (s.filters as Filters).statuses,
        quadrants: (s.filters as Filters).quadrants,
        tags: (s.filters as Filters).tags,
        due: (s.filters as Filters).due,
        completion: (s.filters as Filters).completion,
      }
    : createDefaultFilters();

  return {
    version: 1,
    tasks,
    activeView,
    searchQuery,
    filters,
  };
}

export function loadState(): AppState {
  if (typeof localStorage === "undefined") return createDefaultState();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultState();
  }

  if (!raw) {
    const fresh = createDefaultState();
    saveState(fresh);
    return fresh;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    preserveCorrupt(raw);
    const fresh = createDefaultState();
    saveState(fresh);
    return fresh;
  }

  if (validateAppState(parsed)) {
    return parsed;
  }

  const coerced = coerceAppState(parsed);
  if (coerced && coerced.tasks.length > 0) {
    // Save the coerced version so we don't keep re-running this path.
    saveState(coerced);
    return coerced;
  }

  preserveCorrupt(raw);
  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}

function preserveCorrupt(raw: string): void {
  try {
    localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
  } catch {
    // ignore quota / availability errors
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors (quota, private mode)
  }
}

export function exportState(state: AppState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = formatTodayISO();
  a.href = url;
  a.download = `priority-board-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importState(file: File): Promise<AppState> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (!validateAppState(parsed)) {
    const coerced = coerceAppState(parsed);
    if (!coerced) {
      throw new Error(
        "File does not match the expected app state format."
      );
    }
    return coerced;
  }
  return parsed;
}

function formatTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createId(): string {
  return makeId();
}
