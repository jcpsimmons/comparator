import { format } from "date-fns";
import { CORRUPT_STORAGE_KEY, DEFAULT_FILTERS, STORAGE_KEY, VIEW_ORDER } from "./constants";
import { createDefaultState, isValidDateString, normalizeTags } from "./taskUtils";
import type { AppState, AppView, CompletionFilter, DueFilter, QuadrantKey, Task, TaskStatus } from "./types";

type LoadResult = {
  state: AppState;
  notice: string | null;
};

const VALID_STATUSES = new Set<TaskStatus>(["backlog", "todo", "inProgress", "done"]);
const VALID_QUADRANTS = new Set<QuadrantKey>(["doNow", "schedule", "delegate", "eliminate"]);
const VALID_DUE_FILTERS = new Set<DueFilter>(["all", "overdue", "today", "next7", "none"]);
const VALID_COMPLETION_FILTERS = new Set<CompletionFilter>(["all", "open", "done"]);
const VALID_VIEWS = new Set<AppView>(VIEW_ORDER);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 120 &&
    typeof value.description === "string" &&
    value.description.length <= 1000 &&
    typeof value.status === "string" &&
    VALID_STATUSES.has(value.status as TaskStatus) &&
    typeof value.urgent === "boolean" &&
    typeof value.important === "boolean" &&
    (value.dueDate === null || (typeof value.dueDate === "string" && isValidDateString(value.dueDate))) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    isIsoDateTime(value.createdAt) &&
    isIsoDateTime(value.updatedAt) &&
    (value.completedAt === null || isIsoDateTime(value.completedAt)) &&
    typeof value.sortOrder === "number" &&
    Number.isFinite(value.sortOrder)
  );
}

function areValidStatusFilters(value: unknown): value is TaskStatus[] {
  return Array.isArray(value) && value.every((status) => typeof status === "string" && VALID_STATUSES.has(status as TaskStatus));
}

function areValidQuadrantFilters(value: unknown): value is QuadrantKey[] {
  return Array.isArray(value) && value.every((quadrant) => typeof quadrant === "string" && VALID_QUADRANTS.has(quadrant as QuadrantKey));
}

function areValidTagFilters(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((tag) => typeof tag === "string");
}

export function validateAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isTask)) return false;
  if (typeof value.activeView !== "string" || !VALID_VIEWS.has(value.activeView as AppView)) return false;
  if (typeof value.searchQuery !== "string") return false;
  if (!isRecord(value.filters)) return false;

  return (
    areValidStatusFilters(value.filters.statuses) &&
    areValidQuadrantFilters(value.filters.quadrants) &&
    areValidTagFilters(value.filters.tags) &&
    typeof value.filters.due === "string" &&
    VALID_DUE_FILTERS.has(value.filters.due as DueFilter) &&
    typeof value.filters.completion === "string" &&
    VALID_COMPLETION_FILTERS.has(value.filters.completion as CompletionFilter)
  );
}

function normalizeState(state: AppState): AppState {
  return {
    ...state,
    searchQuery: state.searchQuery || "",
    tasks: state.tasks.map((task) => ({
      ...task,
      title: task.title.trim(),
      description: task.description.trim(),
      dueDate: task.dueDate || null,
      tags: normalizeTags(task.tags),
    })),
    filters: {
      statuses: [...state.filters.statuses],
      quadrants: [...state.filters.quadrants],
      tags: normalizeTags(state.filters.tags),
      due: state.filters.due || DEFAULT_FILTERS.due,
      completion: state.filters.completion || DEFAULT_FILTERS.completion,
    },
  };
}

export function loadState(): LoadResult {
  const defaultState = createDefaultState();

  try {
    const payload = localStorage.getItem(STORAGE_KEY);
    if (!payload) {
      return { state: defaultState, notice: null };
    }

    const parsed = JSON.parse(payload) as unknown;
    if (validateAppState(parsed)) {
      return { state: normalizeState(parsed), notice: null };
    }

    localStorage.setItem(CORRUPT_STORAGE_KEY, payload);
    return {
      state: defaultState,
      notice: "Saved data was invalid, so Priority Board reset to a fresh local board. The corrupt payload was backed up in localStorage.",
    };
  } catch {
    try {
      const payload = localStorage.getItem(STORAGE_KEY);
      if (payload) {
        localStorage.setItem(CORRUPT_STORAGE_KEY, payload);
      }
    } catch {
      // localStorage can fail in private browsing or restricted browser contexts.
    }

    return {
      state: defaultState,
      notice: "Saved data could not be loaded, so Priority Board reset to a fresh local board.",
    };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The UI remains usable even if localStorage is full or unavailable.
  }
}

export function exportState(state: AppState): void {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `priority-board-export-${format(new Date(), "yyyy-MM-dd")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importState(file: File): Promise<AppState> {
  const isJson = file.type === "application/json" || file.name.toLocaleLowerCase().endsWith(".json");
  if (!isJson) {
    throw new Error("Choose a JSON file exported from Priority Board.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!validateAppState(parsed)) {
    throw new Error("The selected JSON does not match the Priority Board format.");
  }

  return normalizeState(parsed);
}
