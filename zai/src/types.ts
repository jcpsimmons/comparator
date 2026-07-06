export type TaskStatus = "backlog" | "todo" | "inProgress" | "done";

export type QuadrantKey = "doNow" | "schedule" | "delegate" | "eliminate";

export type AppView = "kanban" | "matrix" | "list";

export type DueFilter = "all" | "overdue" | "today" | "next7" | "none";
export type CompletionFilter = "all" | "open" | "done";

export interface Task {
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
}

export interface Filters {
  statuses: TaskStatus[];
  quadrants: QuadrantKey[];
  tags: string[];
  due: DueFilter;
  completion: CompletionFilter;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  activeView: AppView;
  searchQuery: string;
  filters: Filters;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null;
  tags: string[];
}
