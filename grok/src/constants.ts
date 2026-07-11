import type {
  AppState,
  Filters,
  QuadrantKey,
  Task,
  TaskStatus,
} from "./types";

export const STORAGE_KEY = "kanban-eisenhower-state";
export const CORRUPT_BACKUP_KEY = "kanban-eisenhower-state-corrupt-backup";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "inProgress",
  "done",
];

export const QUADRANT_KEYS: QuadrantKey[] = [
  "doNow",
  "schedule",
  "delegate",
  "eliminate",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  inProgress: "In Progress",
  done: "Done",
};

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

export const DEFAULT_FILTERS: Filters = {
  statuses: [],
  quadrants: [],
  tags: [],
  due: "all",
  completion: "all",
};

export function createDefaultFilters(): Filters {
  return {
    statuses: [],
    quadrants: [],
    tags: [],
    due: "all",
    completion: "all",
  };
}

function sampleId(n: number): string {
  return `sample-task-${n}`;
}

export function createSampleTasks(now = new Date()): Task[] {
  const iso = now.toISOString();
  const samples: Array<
    Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt" | "sortOrder"> & {
      completed?: boolean;
    }
  > = [
    {
      title: "Clarify project scope",
      description: "Define goals, constraints, and success criteria.",
      status: "todo",
      urgent: true,
      important: true,
      dueDate: null,
      tags: ["Planning"],
    },
    {
      title: "Draft weekly review",
      description: "Summarize wins, blockers, and next priorities.",
      status: "backlog",
      urgent: false,
      important: true,
      dueDate: null,
      tags: ["Review"],
    },
    {
      title: "Reply to vendor follow-up",
      description: "Respond to outstanding procurement questions.",
      status: "todo",
      urgent: true,
      important: false,
      dueDate: null,
      tags: ["Admin"],
    },
    {
      title: "Remove stale bookmarks",
      description: "Clean up unused links and folders.",
      status: "backlog",
      urgent: false,
      important: false,
      dueDate: null,
      tags: ["Cleanup"],
    },
    {
      title: "Prepare launch checklist",
      description: "List launch blockers and owners.",
      status: "inProgress",
      urgent: false,
      important: true,
      dueDate: null,
      tags: ["Launch"],
    },
    {
      title: "Archive completed notes",
      description: "File finished notes out of the active workspace.",
      status: "done",
      urgent: false,
      important: false,
      dueDate: null,
      tags: ["Admin"],
      completed: true,
    },
  ];

  return samples.map((s, i) => ({
    id: sampleId(i + 1),
    title: s.title,
    description: s.description,
    status: s.status,
    urgent: s.urgent,
    important: s.important,
    dueDate: s.dueDate,
    tags: s.tags,
    createdAt: iso,
    updatedAt: iso,
    completedAt: s.completed ? iso : null,
    sortOrder: i,
  }));
}

export function createDefaultState(now = new Date()): AppState {
  return {
    version: 1,
    tasks: createSampleTasks(now),
    activeView: "kanban",
    searchQuery: "",
    filters: createDefaultFilters(),
  };
}
