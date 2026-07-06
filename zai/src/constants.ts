import type {
  AppView,
  AppState,
  QuadrantKey,
  Task,
  TaskStatus,
} from "./types";

export const STORAGE_KEY = "kanban-eisenhower-state";
export const CORRUPT_BACKUP_KEY = "kanban-eisenhower-state-corrupt-backup";

export const STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "todo",
  "inProgress",
  "done",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  inProgress: "In Progress",
  done: "Done",
};

export const STATUS_COLUMN_ORDER: TaskStatus[] = [
  "backlog",
  "todo",
  "inProgress",
  "done",
];

export const QUADRANT_LIST: QuadrantKey[] = [
  "doNow",
  "schedule",
  "delegate",
  "eliminate",
];

export const QUADRANT_LABELS: Record<QuadrantKey, string> = {
  doNow: "Do Now",
  schedule: "Schedule",
  delegate: "Delegate",
  eliminate: "Eliminate",
};

export const QUADRANT_DESCRIPTIONS: Record<QuadrantKey, string> = {
  doNow: "Urgent and important",
  schedule: "Important, not urgent",
  delegate: "Urgent, less important",
  eliminate: "Neither urgent nor important",
};

export const QUADRANT_FLAGS: Record<
  QuadrantKey,
  { urgent: boolean; important: boolean }
> = {
  doNow: { urgent: true, important: true },
  schedule: { urgent: false, important: true },
  delegate: { urgent: true, important: false },
  eliminate: { urgent: false, important: false },
};

export const VIEW_LABELS: Record<AppView, string> = {
  kanban: "Kanban",
  matrix: "Matrix",
  list: "List",
};

export const ACCENT_COLORS: Record<
  QuadrantKey,
  "red" | "blue" | "amber" | "gray"
> = {
  doNow: "red",
  schedule: "blue",
  delegate: "amber",
  eliminate: "gray",
};

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;

export const DUE_FILTER_LABELS: Record<string, string> = {
  all: "All due",
  overdue: "Overdue",
  today: "Today",
  next7: "Next 7 days",
  none: "No due date",
};

export const COMPLETION_FILTER_LABELS: Record<string, string> = {
  all: "All",
  open: "Open",
  done: "Done",
};

export function createDefaultFilters(): AppState["filters"] {
  return {
    statuses: [],
    quadrants: [],
    tags: [],
    due: "all",
    completion: "all",
  };
}

export function createDefaultState(): AppState {
  return {
    version: 1,
    tasks: createSampleTasks(),
    activeView: "kanban",
    searchQuery: "",
    filters: createDefaultFilters(),
  };
}

function nowISO(): string {
  return new Date().toISOString();
}

function makeSampleTask(
  partial: Pick<
    Task,
    "title" | "status" | "urgent" | "important" | "tags"
  > & { completed?: boolean; sortOrder: number }
): Task {
  const created = nowISO();
  const isDone = partial.completed ?? partial.status === "done";
  return {
    id: makeId(),
    title: partial.title,
    description: "",
    status: partial.status,
    urgent: partial.urgent,
    important: partial.important,
    dueDate: null,
    tags: partial.tags,
    createdAt: created,
    updatedAt: created,
    completedAt: isDone ? created : null,
    sortOrder: partial.sortOrder,
  };
}

export function createSampleTasks(): Task[] {
  return [
    makeSampleTask({
      title: "Clarify project scope",
      status: "todo",
      urgent: true,
      important: true,
      tags: ["Planning"],
      sortOrder: 0,
    }),
    makeSampleTask({
      title: "Draft weekly review",
      status: "backlog",
      urgent: false,
      important: true,
      tags: ["Review"],
      sortOrder: 0,
    }),
    makeSampleTask({
      title: "Reply to vendor follow-up",
      status: "todo",
      urgent: true,
      important: false,
      tags: ["Admin"],
      sortOrder: 1,
    }),
    makeSampleTask({
      title: "Remove stale bookmarks",
      status: "backlog",
      urgent: false,
      important: false,
      tags: ["Cleanup"],
      sortOrder: 1,
    }),
    makeSampleTask({
      title: "Prepare launch checklist",
      status: "inProgress",
      urgent: false,
      important: true,
      tags: ["Launch"],
      sortOrder: 0,
    }),
    makeSampleTask({
      title: "Archive completed notes",
      status: "done",
      urgent: false,
      important: false,
      tags: ["Admin"],
      completed: true,
      sortOrder: 0,
    }),
  ];
}

export function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
