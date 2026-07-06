import { format } from "date-fns";
import {
  CORRUPT_BACKUP_KEY,
  DEFAULT_FILTERS,
  QUADRANT_ORDER,
  STATUS_ORDER,
  STORAGE_KEY,
} from "./constants";
import { createTask } from "./taskUtils";
import type { AppState, Filters, Task, TaskDraft } from "./types";

const SAMPLE_TASK_INPUTS: TaskDraft[] = [
  {
    title: "Clarify project scope",
    description: "Write down what is in and out of scope before kickoff.",
    status: "todo",
    urgent: true,
    important: true,
    dueDate: null,
    tags: ["Planning"],
  },
  {
    title: "Draft weekly review",
    description: "Summarize wins, blockers, and next week's focus.",
    status: "backlog",
    urgent: false,
    important: true,
    dueDate: null,
    tags: ["Review"],
  },
  {
    title: "Reply to vendor follow-up",
    description: "",
    status: "todo",
    urgent: true,
    important: false,
    dueDate: null,
    tags: ["Admin"],
  },
  {
    title: "Remove stale bookmarks",
    description: "",
    status: "backlog",
    urgent: false,
    important: false,
    dueDate: null,
    tags: ["Cleanup"],
  },
  {
    title: "Prepare launch checklist",
    description: "Cover QA, rollout steps, and comms.",
    status: "inProgress",
    urgent: false,
    important: true,
    dueDate: null,
    tags: ["Launch"],
  },
  {
    title: "Archive completed notes",
    description: "",
    status: "done",
    urgent: false,
    important: false,
    dueDate: null,
    tags: ["Admin"],
  },
];

export function createDefaultState(): AppState {
  const tasks: Task[] = [];
  for (const input of SAMPLE_TASK_INPUTS) {
    tasks.push(createTask(input, tasks));
  }
  return {
    version: 1,
    tasks,
    activeView: "kanban",
    searchQuery: "",
    filters: { ...DEFAULT_FILTERS },
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isValidTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    isString(t.id) &&
    isString(t.title) &&
    isString(t.description) &&
    isString(t.status) &&
    (STATUS_ORDER as string[]).includes(t.status) &&
    typeof t.urgent === "boolean" &&
    typeof t.important === "boolean" &&
    (t.dueDate === null || isString(t.dueDate)) &&
    Array.isArray(t.tags) &&
    t.tags.every(isString) &&
    isString(t.createdAt) &&
    isString(t.updatedAt) &&
    (t.completedAt === null || isString(t.completedAt)) &&
    typeof t.sortOrder === "number" &&
    Number.isFinite(t.sortOrder)
  );
}

function normalizeFilters(value: unknown): Filters {
  const filters: Filters = {
    statuses: [],
    quadrants: [],
    tags: [],
    due: "all",
    completion: "all",
  };
  if (typeof value !== "object" || value === null) return filters;
  const f = value as Record<string, unknown>;
  if (Array.isArray(f.statuses)) {
    filters.statuses = f.statuses.filter(
      (s): s is Filters["statuses"][number] =>
        isString(s) && (STATUS_ORDER as string[]).includes(s)
    );
  }
  if (Array.isArray(f.quadrants)) {
    filters.quadrants = f.quadrants.filter(
      (q): q is Filters["quadrants"][number] =>
        isString(q) && (QUADRANT_ORDER as string[]).includes(q)
    );
  }
  if (Array.isArray(f.tags)) {
    filters.tags = f.tags.filter(isString);
  }
  if (isString(f.due) && ["all", "overdue", "today", "next7", "none"].includes(f.due)) {
    filters.due = f.due as Filters["due"];
  }
  if (isString(f.completion) && ["all", "open", "done"].includes(f.completion)) {
    filters.completion = f.completion as Filters["completion"];
  }
  return filters;
}

/**
 * Validate an unknown value as AppState. Task records are validated strictly;
 * view/search/filter preferences are normalized to safe defaults.
 */
export function validateAppState(value: unknown): AppState | null {
  if (typeof value !== "object" || value === null) return null;
  const s = value as Record<string, unknown>;
  if (s.version !== 1) return null;
  if (!Array.isArray(s.tasks) || !s.tasks.every(isValidTask)) return null;
  const activeView =
    isString(s.activeView) && ["kanban", "matrix", "list"].includes(s.activeView)
      ? (s.activeView as AppState["activeView"])
      : "kanban";
  return {
    version: 1,
    tasks: s.tasks as Task[],
    activeView,
    searchQuery: isString(s.searchQuery) ? s.searchQuery : "",
    filters: normalizeFilters(s.filters),
  };
}

export type LoadResult = {
  state: AppState;
  corrupted: boolean;
};

export function loadState(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: createDefaultState(), corrupted: false };
  }
  if (raw === null) {
    return { state: createDefaultState(), corrupted: false };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const state = validateAppState(parsed);
    if (state) {
      return { state, corrupted: false };
    }
  } catch {
    // fall through to corrupt handling
  }
  try {
    localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
  } catch {
    // backup is best-effort
  }
  return { state: createDefaultState(), corrupted: true };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode, quota); app keeps working in memory
  }
}

export function exportState(state: AppState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `priority-board-export-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function importState(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    if (file.type && file.type !== "application/json" && !file.name.endsWith(".json")) {
      reject(new Error("Import failed: please choose a .json file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Import failed: could not read the file."));
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const state = validateAppState(parsed);
        if (!state) {
          reject(new Error("Import failed: the file is not a valid Priority Board export."));
          return;
        }
        resolve(state);
      } catch {
        reject(new Error("Import failed: the file is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}
