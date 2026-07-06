import type { Filters, QuadrantKey, TaskStatus } from "./types";

export const STORAGE_KEY = "kanban-eisenhower-state";
export const CORRUPT_BACKUP_KEY = "kanban-eisenhower-state-corrupt-backup";

export const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "inProgress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  inProgress: "In Progress",
  done: "Done",
};

export const QUADRANT_ORDER: QuadrantKey[] = ["doNow", "schedule", "delegate", "eliminate"];

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

export const QUADRANT_FLAGS: Record<QuadrantKey, { urgent: boolean; important: boolean }> = {
  doNow: { urgent: true, important: true },
  schedule: { urgent: false, important: true },
  delegate: { urgent: true, important: false },
  eliminate: { urgent: false, important: false },
};

export const DEFAULT_FILTERS: Filters = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;
