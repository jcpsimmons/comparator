import type { AppState, AppView, CompletionFilter, DueFilter, QuadrantKey, TaskStatus } from "./types";

export const STORAGE_KEY = "kanban-eisenhower-state";
export const CORRUPT_STORAGE_KEY = "kanban-eisenhower-state-corrupt-backup";

export const VIEW_ORDER: AppView[] = ["kanban", "matrix", "list"];

export const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "inProgress", "done"];

export const STATUS_META: Record<TaskStatus, { label: string; className: string }> = {
  backlog: { label: "Backlog", className: "status-backlog" },
  todo: { label: "To Do", className: "status-todo" },
  inProgress: { label: "In Progress", className: "status-in-progress" },
  done: { label: "Done", className: "status-done" },
};

export const QUADRANT_ORDER: QuadrantKey[] = ["doNow", "schedule", "delegate", "eliminate"];

export const QUADRANT_META: Record<
  QuadrantKey,
  { label: string; description: string; urgent: boolean; important: boolean; className: string }
> = {
  doNow: {
    label: "Do Now",
    description: "Urgent and important",
    urgent: true,
    important: true,
    className: "quadrant-do-now",
  },
  schedule: {
    label: "Schedule",
    description: "Important, not urgent",
    urgent: false,
    important: true,
    className: "quadrant-schedule",
  },
  delegate: {
    label: "Delegate",
    description: "Urgent, less important",
    urgent: true,
    important: false,
    className: "quadrant-delegate",
  },
  eliminate: {
    label: "Eliminate",
    description: "Neither urgent nor important",
    urgent: false,
    important: false,
    className: "quadrant-eliminate",
  },
};

export const DEFAULT_FILTERS: AppState["filters"] = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  all: "All due dates",
  overdue: "Overdue",
  today: "Today",
  next7: "Next 7 days",
  none: "No due date",
};

export const COMPLETION_FILTER_LABELS: Record<CompletionFilter, string> = {
  all: "All tasks",
  open: "Open",
  done: "Done",
};
