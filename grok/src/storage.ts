import {
  CORRUPT_BACKUP_KEY,
  STORAGE_KEY,
  createDefaultFilters,
  createDefaultState,
} from "./constants";
import type {
  AppState,
  AppView,
  CompletionFilter,
  DueFilter,
  Filters,
  QuadrantKey,
  Task,
  TaskStatus,
} from "./types";
import { TASK_STATUSES, QUADRANT_KEYS } from "./constants";

const APP_VIEWS: AppView[] = ["kanban", "matrix", "list"];
const DUE_FILTERS: DueFilter[] = ["all", "overdue", "today", "next7", "none"];
const COMPLETION_FILTERS: CompletionFilter[] = ["all", "open", "done"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return isString(value) && (TASK_STATUSES as string[]).includes(value);
}

function isQuadrantKey(value: unknown): value is QuadrantKey {
  return isString(value) && (QUADRANT_KEYS as string[]).includes(value);
}

function isAppView(value: unknown): value is AppView {
  return isString(value) && (APP_VIEWS as string[]).includes(value);
}

function isDueFilter(value: unknown): value is DueFilter {
  return isString(value) && (DUE_FILTERS as string[]).includes(value);
}

function isCompletionFilter(value: unknown): value is CompletionFilter {
  return isString(value) && (COMPLETION_FILTERS as string[]).includes(value);
}

function isValidIsoDateOrNull(value: unknown): value is string | null {
  if (value === null) return true;
  if (!isString(value)) return false;
  if (value === "") return false;
  // Accept YYYY-MM-DD or full ISO datetime
  return !Number.isNaN(Date.parse(value));
}

function isValidTask(value: unknown): value is Task {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !value.id) return false;
  if (!isString(value.title)) return false;
  if (!isString(value.description)) return false;
  if (!isTaskStatus(value.status)) return false;
  if (!isBoolean(value.urgent)) return false;
  if (!isBoolean(value.important)) return false;
  if (!(value.dueDate === null || (isString(value.dueDate) && /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate)))) {
    return false;
  }
  if (!Array.isArray(value.tags) || !value.tags.every(isString)) return false;
  if (!isString(value.createdAt) || Number.isNaN(Date.parse(value.createdAt))) return false;
  if (!isString(value.updatedAt) || Number.isNaN(Date.parse(value.updatedAt))) return false;
  if (!isValidIsoDateOrNull(value.completedAt)) return false;
  if (!isNumber(value.sortOrder)) return false;
  return true;
}

function isValidFilters(value: unknown): value is Filters {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.statuses) || !value.statuses.every(isTaskStatus)) return false;
  if (!Array.isArray(value.quadrants) || !value.quadrants.every(isQuadrantKey)) return false;
  if (!Array.isArray(value.tags) || !value.tags.every(isString)) return false;
  if (!isDueFilter(value.due)) return false;
  if (!isCompletionFilter(value.completion)) return false;
  return true;
}

export function validateAppState(value: unknown): value is AppState {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isValidTask)) return false;
  if (!isAppView(value.activeView)) return false;
  if (!isString(value.searchQuery)) return false;
  if (!isValidFilters(value.filters)) return false;
  return true;
}

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type LoadResult =
  | { ok: true; state: AppState; recoveredFromCorrupt?: boolean }
  | { ok: false; state: AppState; error: string; recoveredFromCorrupt: true };

export function loadState(storage: StorageLike = localStorage): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      ok: false,
      state: createDefaultState(),
      error: "Unable to read saved state. Using defaults.",
      recoveredFromCorrupt: true,
    };
  }

  if (raw === null || raw === "") {
    return { ok: true, state: createDefaultState() };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (validateAppState(parsed)) {
      return { ok: true, state: parsed };
    }
    // corrupt structure
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // ignore backup failure
    }
    return {
      ok: false,
      state: createDefaultState(),
      error: "Saved state was corrupt and has been reset. A backup was preserved.",
      recoveredFromCorrupt: true,
    };
  } catch {
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // ignore
    }
    return {
      ok: false,
      state: createDefaultState(),
      error: "Saved state was corrupt and has been reset. A backup was preserved.",
      recoveredFromCorrupt: true,
    };
  }
}

export function saveState(state: AppState, storage: StorageLike = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state: AppState, now = new Date()): {
  filename: string;
  json: string;
} {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const filename = `priority-board-export-${yyyy}-${mm}-${dd}.json`;
  return {
    filename,
    json: JSON.stringify(state, null, 2),
  };
}

export type ImportResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

export async function importState(file: File | Blob | string): Promise<ImportResult> {
  let text: string;
  try {
    if (typeof file === "string") {
      text = file;
    } else {
      text = await file.text();
    }
  } catch {
    return { ok: false, error: "Could not read the import file." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }

  if (!validateAppState(parsed)) {
    return {
      ok: false,
      error: "Import file is missing required fields or has invalid task records.",
    };
  }

  // Normalize filters if partial was accepted (validate already requires full)
  const state: AppState = {
    version: 1,
    tasks: parsed.tasks,
    activeView: parsed.activeView,
    searchQuery: parsed.searchQuery,
    filters: {
      ...createDefaultFilters(),
      ...parsed.filters,
    },
  };

  return { ok: true, state };
}

export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
