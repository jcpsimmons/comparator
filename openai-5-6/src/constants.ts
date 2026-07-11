import type { AppState, QuadrantKey, Task, TaskFilters, TaskStatus } from "./types";

export const APP_STATE_VERSION = 1 as const;

export const STORAGE_KEY = "kanban-eisenhower-state";
export const CORRUPT_BACKUP_KEY = "kanban-eisenhower-state-corrupt-backup";

export const STATUS_ORDER: readonly TaskStatus[] = ["backlog", "todo", "inProgress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  inProgress: "In Progress",
  done: "Done",
};

export const STATUS_META: Record<TaskStatus, { label: string; description: string }> = {
  backlog: {
    label: STATUS_LABELS.backlog,
    description: "Ideas and work not yet scheduled",
  },
  todo: {
    label: STATUS_LABELS.todo,
    description: "Ready to begin",
  },
  inProgress: {
    label: STATUS_LABELS.inProgress,
    description: "Work currently underway",
  },
  done: {
    label: STATUS_LABELS.done,
    description: "Completed work",
  },
};

export const QUADRANT_ORDER: readonly QuadrantKey[] = [
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

export const QUADRANT_FLAGS: Record<QuadrantKey, { urgent: boolean; important: boolean }> = {
  doNow: { urgent: true, important: true },
  schedule: { urgent: false, important: true },
  delegate: { urgent: true, important: false },
  eliminate: { urgent: false, important: false },
};

export const QUADRANT_META: Record<
  QuadrantKey,
  {
    label: string;
    description: string;
    urgent: boolean;
    important: boolean;
  }
> = {
  doNow: {
    label: QUADRANT_LABELS.doNow,
    description: "Urgent and important",
    ...QUADRANT_FLAGS.doNow,
  },
  schedule: {
    label: QUADRANT_LABELS.schedule,
    description: "Important, not urgent",
    ...QUADRANT_FLAGS.schedule,
  },
  delegate: {
    label: QUADRANT_LABELS.delegate,
    description: "Urgent, less important",
    ...QUADRANT_FLAGS.delegate,
  },
  eliminate: {
    label: QUADRANT_LABELS.eliminate,
    description: "Neither urgent nor important",
    ...QUADRANT_FLAGS.eliminate,
  },
};

export const DEFAULT_FILTERS: TaskFilters = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

function makeSampleTask(
  task: Pick<Task, "id" | "title" | "status" | "urgent" | "important" | "tags">,
  sortOrder: number,
  timestamp: string,
): Task {
  const completedAt = task.status === "done" ? timestamp : null;

  return {
    ...task,
    description: "",
    dueDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt,
    sortOrder,
  };
}

/** Creates fresh first-load data so callers never share mutable arrays. */
export function createDefaultState(now: Date = new Date()): AppState {
  const timestamp = now.toISOString();
  const tasks: Task[] = [
    makeSampleTask(
      {
        id: "sample-clarify-project-scope",
        title: "Clarify project scope",
        status: "todo",
        urgent: true,
        important: true,
        tags: ["Planning"],
      },
      0,
      timestamp,
    ),
    makeSampleTask(
      {
        id: "sample-draft-weekly-review",
        title: "Draft weekly review",
        status: "backlog",
        urgent: false,
        important: true,
        tags: ["Review"],
      },
      1,
      timestamp,
    ),
    makeSampleTask(
      {
        id: "sample-reply-vendor-follow-up",
        title: "Reply to vendor follow-up",
        status: "todo",
        urgent: true,
        important: false,
        tags: ["Admin"],
      },
      2,
      timestamp,
    ),
    makeSampleTask(
      {
        id: "sample-remove-stale-bookmarks",
        title: "Remove stale bookmarks",
        status: "backlog",
        urgent: false,
        important: false,
        tags: ["Cleanup"],
      },
      3,
      timestamp,
    ),
    makeSampleTask(
      {
        id: "sample-prepare-launch-checklist",
        title: "Prepare launch checklist",
        status: "inProgress",
        urgent: false,
        important: true,
        tags: ["Launch"],
      },
      4,
      timestamp,
    ),
    makeSampleTask(
      {
        id: "sample-archive-completed-notes",
        title: "Archive completed notes",
        status: "done",
        urgent: false,
        important: false,
        tags: ["Admin"],
      },
      5,
      timestamp,
    ),
  ];

  return {
    version: APP_STATE_VERSION,
    tasks,
    activeView: "kanban",
    searchQuery: "",
    filters: {
      statuses: [],
      quadrants: [],
      tags: [],
      due: DEFAULT_FILTERS.due,
      completion: DEFAULT_FILTERS.completion,
    },
  };
}
