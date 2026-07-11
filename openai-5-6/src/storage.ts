import { format, isValid, parseISO } from "date-fns";
import {
  APP_STATE_VERSION,
  CORRUPT_BACKUP_KEY,
  createDefaultState,
  QUADRANT_ORDER,
  STATUS_ORDER,
  STORAGE_KEY,
} from "./constants";
import { isValidDueDate, normalizeTags } from "./taskUtils";
import type { AppState, CompletionFilter, DueFilter, Task, TaskFilters } from "./types";

const APP_STATE_KEYS = ["version", "tasks", "activeView", "searchQuery", "filters"] as const;
const TASK_KEYS = [
  "id",
  "title",
  "description",
  "status",
  "urgent",
  "important",
  "dueDate",
  "tags",
  "createdAt",
  "updatedAt",
  "completedAt",
  "sortOrder",
] as const;
const FILTER_KEYS = ["statuses", "quadrants", "tags", "due", "completion"] as const;

const APP_VIEWS = ["kanban", "matrix", "list"] as const;
const DUE_FILTERS: readonly DueFilter[] = ["all", "overdue", "today", "next7", "none"];
const COMPLETION_FILTERS: readonly CompletionFilter[] = ["all", "open", "done"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string" || !value.includes("T")) return false;
  return isValid(parseISO(value));
}

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function isNormalizedTagArray(value: unknown): value is string[] {
  if (!Array.isArray(value) || !value.every((tag) => typeof tag === "string")) {
    return false;
  }

  const normalized = normalizeTags(value);
  return (
    normalized.length === value.length && normalized.every((tag, index) => tag === value[index])
  );
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value) || !hasExactKeys(value, TASK_KEYS)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 120 &&
    typeof value.description === "string" &&
    value.description.length <= 1000 &&
    typeof value.status === "string" &&
    STATUS_ORDER.includes(value.status as Task["status"]) &&
    typeof value.urgent === "boolean" &&
    typeof value.important === "boolean" &&
    (value.dueDate === null ||
      (typeof value.dueDate === "string" && isValidDueDate(value.dueDate))) &&
    isNormalizedTagArray(value.tags) &&
    isIsoDateTime(value.createdAt) &&
    isIsoDateTime(value.updatedAt) &&
    (value.completedAt === null || isIsoDateTime(value.completedAt)) &&
    ((value.status === "done" && value.completedAt !== null) ||
      (value.status !== "done" && value.completedAt === null)) &&
    typeof value.sortOrder === "number" &&
    Number.isFinite(value.sortOrder)
  );
}

function isFilters(value: unknown): value is TaskFilters {
  if (!isRecord(value) || !hasExactKeys(value, FILTER_KEYS)) return false;

  if (
    !Array.isArray(value.statuses) ||
    !value.statuses.every(
      (status) => typeof status === "string" && STATUS_ORDER.includes(status as Task["status"]),
    ) ||
    !hasUniqueValues(value.statuses as string[])
  ) {
    return false;
  }

  if (
    !Array.isArray(value.quadrants) ||
    !value.quadrants.every(
      (quadrant) =>
        typeof quadrant === "string" &&
        QUADRANT_ORDER.includes(quadrant as TaskFilters["quadrants"][number]),
    ) ||
    !hasUniqueValues(value.quadrants as string[])
  ) {
    return false;
  }

  if (!isNormalizedTagArray(value.tags)) return false;

  return (
    typeof value.due === "string" &&
    DUE_FILTERS.includes(value.due as DueFilter) &&
    typeof value.completion === "string" &&
    COMPLETION_FILTERS.includes(value.completion as CompletionFilter)
  );
}

/** Strict runtime type guard for persisted and imported application state. */
export function validateAppState(value: unknown): value is AppState {
  if (!isRecord(value) || !hasExactKeys(value, APP_STATE_KEYS)) return false;
  if (value.version !== APP_STATE_VERSION) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isTask)) return false;

  const taskIds = value.tasks.map((task) => task.id);
  if (!hasUniqueValues(taskIds)) return false;

  return (
    typeof value.activeView === "string" &&
    APP_VIEWS.includes(value.activeView as AppState["activeView"]) &&
    typeof value.searchQuery === "string" &&
    isFilters(value.filters)
  );
}

function getLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function preserveCorruptPayload(storage: Storage, payload: string): void {
  try {
    storage.setItem(CORRUPT_BACKUP_KEY, payload);
  } catch {
    // Storage may be unavailable or full. Resetting in memory is still safe.
  }
}

let recoveredCorruptState = false;

/**
 * Reports a corrupt-state recovery once. This lets the UI show a non-blocking
 * notice without changing loadState's convenient AppState return type.
 */
export function consumeCorruptStateRecovery(): boolean {
  const recovered = recoveredCorruptState;
  recoveredCorruptState = false;
  return recovered;
}

/** Loads valid persisted data, or fresh sample data when absent/corrupt. */
export function loadState(): AppState {
  const storage = getLocalStorage();
  if (storage === null) return createDefaultState();

  let payload: string | null;
  try {
    payload = storage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultState();
  }

  if (payload === null) return createDefaultState();

  try {
    const parsed: unknown = JSON.parse(payload);
    if (validateAppState(parsed)) return parsed;
  } catch {
    // The raw payload is preserved below for possible manual recovery.
  }

  preserveCorruptPayload(storage, payload);
  recoveredCorruptState = true;
  const defaultState = createDefaultState();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  } catch {
    // The validated in-memory default is still safe to use.
  }
  return defaultState;
}

/** Returns false if validation fails or browser storage cannot be written. */
export function saveState(state: AppState): boolean {
  if (!validateAppState(state)) return false;

  const storage = getLocalStorage();
  if (storage === null) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Downloads the complete state as a dated, human-readable JSON file. */
export function exportState(state: AppState): void {
  if (!validateAppState(state)) {
    throw new Error("The current board state is invalid and cannot be exported.");
  }
  if (typeof document === "undefined") {
    throw new Error("Export is only available in a browser.");
  }

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `priority-board-export-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Reads and validates JSON without mutating the currently persisted state. */
export async function importState(file: File): Promise<AppState> {
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new Error("Choose a JSON file to import.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file does not contain valid JSON.");
  }

  if (!validateAppState(parsed)) {
    throw new Error("The selected file is not a valid Priority Board export.");
  }

  return parsed;
}
