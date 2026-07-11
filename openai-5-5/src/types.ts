export type TaskStatus = "backlog" | "todo" | "inProgress" | "done";

export type QuadrantKey = "doNow" | "schedule" | "delegate" | "eliminate";

export type AppView = "kanban" | "matrix" | "list";

export type DueFilter = "all" | "overdue" | "today" | "next7" | "none";

export type CompletionFilter = "all" | "open" | "done";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  sortOrder: number;
};

export type AppState = {
  version: 1;
  tasks: Task[];
  activeView: AppView;
  searchQuery: string;
  filters: {
    statuses: TaskStatus[];
    quadrants: QuadrantKey[];
    tags: string[];
    due: DueFilter;
    completion: CompletionFilter;
  };
};

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null;
  tags: string[];
};

export type ListSortKey = "default" | "dueDate" | "status" | "quadrant" | "title" | "updatedAt";

export type SortDirection = "asc" | "desc";
