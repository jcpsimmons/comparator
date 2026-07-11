export type TaskStatus = "backlog" | "todo" | "inProgress" | "done";

export type QuadrantKey = "doNow" | "schedule" | "delegate" | "eliminate";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null; // ISO date string: YYYY-MM-DD
  tags: string[];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  completedAt: string | null; // ISO datetime
  sortOrder: number;
};

export type AppView = "kanban" | "matrix" | "list";

export type DueFilter = "all" | "overdue" | "today" | "next7" | "none";
export type CompletionFilter = "all" | "open" | "done";

export type Filters = {
  statuses: TaskStatus[];
  quadrants: QuadrantKey[];
  tags: string[];
  due: DueFilter;
  completion: CompletionFilter;
};

export type AppState = {
  version: 1;
  tasks: Task[];
  activeView: AppView;
  searchQuery: string;
  filters: Filters;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  urgent?: boolean;
  important?: boolean;
  dueDate?: string | null;
  tags?: string[];
  sortOrder?: number;
};

export type ListSortKey =
  | "default"
  | "title"
  | "status"
  | "quadrant"
  | "dueDate"
  | "updatedAt";

export type ListSortDir = "asc" | "desc";
