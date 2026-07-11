import { X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { KanbanView } from "./components/KanbanView";
import { ListView } from "./components/ListView";
import { MatrixView } from "./components/MatrixView";
import { type TaskFormValues, TaskModal } from "./components/TaskModal";
import { DEFAULT_FILTERS, QUADRANT_FLAGS } from "./constants";
import {
  consumeCorruptStateRecovery,
  exportState,
  importState,
  loadState,
  saveState,
} from "./storage";
import {
  createTask,
  filterTasks,
  getQuadrant,
  sortTasksByOrder,
  toggleTaskCompletion,
  updateTask,
} from "./taskUtils";
import type { AppState, AppView, QuadrantKey, Task, TaskFilters, TaskStatus } from "./types";

type Notice = {
  tone: "error" | "success";
  message: string;
};

const INITIAL_STATE = loadState();
const RECOVERED_CORRUPT_STATE = consumeCorruptStateRecovery();

function freshDefaultFilters(): TaskFilters {
  return {
    statuses: [...DEFAULT_FILTERS.statuses],
    quadrants: [...DEFAULT_FILTERS.quadrants],
    tags: [...DEFAULT_FILTERS.tags],
    due: DEFAULT_FILTERS.due,
    completion: DEFAULT_FILTERS.completion,
  };
}

function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== "all" ||
    filters.completion !== "all"
  );
}

function sortedUniqueTags(tasks: readonly Task[]): string[] {
  const firstCasing = new Map<string, string>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      const key = tag.toLocaleLowerCase();
      if (!firstCasing.has(key)) firstCasing.set(key, tag);
    }
  }

  return [...firstCasing.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

function reorderDestination(
  movingTaskId: string,
  destinationTasks: readonly Task[],
  beforeTaskId: string | null,
): Map<string, number> {
  const ordered = sortTasksByOrder(destinationTasks.filter((task) => task.id !== movingTaskId)).map(
    (task) => task.id,
  );
  const insertionIndex = beforeTaskId === null ? ordered.length : ordered.indexOf(beforeTaskId);
  ordered.splice(insertionIndex < 0 ? ordered.length : insertionIndex, 0, movingTaskId);

  const sortOrders = new Map<string, number>();
  ordered.forEach((id, index) => {
    sortOrders.set(id, index);
  });
  return sortOrders;
}

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(
    RECOVERED_CORRUPT_STATE
      ? {
          tone: "error",
          message:
            "Saved board data was corrupt, so Priority Board restored the sample board. The original data was preserved as a local backup.",
        }
      : null,
  );

  useEffect(() => {
    if (!saveState(state)) {
      setNotice({
        tone: "error",
        message:
          "Changes could not be saved in this browser. Keep this tab open and export a backup.",
      });
    }
  }, [state]);

  const visibleTasks = useMemo(
    () => filterTasks(state.tasks, state.searchQuery, state.filters),
    [state.filters, state.searchQuery, state.tasks],
  );
  const availableTags = useMemo(() => sortedUniqueTags(state.tasks), [state.tasks]);
  const editingTask =
    editingTaskId === null ? null : (state.tasks.find((task) => task.id === editingTaskId) ?? null);

  const updateState = (patch: Partial<AppState>) => {
    setState((current) => ({ ...current, ...patch }));
  };

  const openNewTask = () => {
    setEditingTaskId(null);
    setIsTaskModalOpen(true);
  };

  const openTaskEditor = (task: Task) => {
    setEditingTaskId(task.id);
    setIsTaskModalOpen(true);
  };

  const closeTaskEditor = () => {
    setIsTaskModalOpen(false);
    setEditingTaskId(null);
  };

  const saveTask = (values: TaskFormValues) => {
    setState((current) => {
      if (editingTaskId === null) {
        return {
          ...current,
          tasks: [...current.tasks, createTask(values, current.tasks)],
        };
      }

      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === editingTaskId ? updateTask(task, values) : task,
        ),
      };
    });
  };

  const removeTask = (task: Task) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((candidate) => candidate.id !== task.id),
    }));
  };

  const confirmAndRemoveTask = (task: Task) => {
    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      removeTask(task);
    }
  };

  const toggleCompletion = (task: Task) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((candidate) =>
        candidate.id === task.id ? toggleTaskCompletion(candidate) : candidate,
      ),
    }));
  };

  const moveKanbanTask = (taskId: string, destination: TaskStatus, beforeTaskId: string | null) => {
    setState((current) => {
      const movingTask = current.tasks.find((task) => task.id === taskId);
      if (!movingTask) return current;

      const destinationTasks = current.tasks.filter(
        (task) => task.id !== taskId && task.status === destination,
      );
      const sortOrders = reorderDestination(taskId, destinationTasks, beforeTaskId);
      const now = new Date();

      return {
        ...current,
        tasks: current.tasks.map((task) => {
          const nextSortOrder = sortOrders.get(task.id);
          if (task.id === taskId) {
            return updateTask(task, { status: destination, sortOrder: nextSortOrder ?? 0 }, now);
          }
          return nextSortOrder === undefined ? task : { ...task, sortOrder: nextSortOrder };
        }),
      };
    });
  };

  const moveMatrixTask = (
    taskId: string,
    destination: QuadrantKey,
    beforeTaskId: string | null,
  ) => {
    setState((current) => {
      const movingTask = current.tasks.find((task) => task.id === taskId);
      if (!movingTask) return current;

      const destinationTasks = current.tasks.filter(
        (task) => task.id !== taskId && getQuadrant(task) === destination,
      );
      const sortOrders = reorderDestination(taskId, destinationTasks, beforeTaskId);
      const now = new Date();

      return {
        ...current,
        tasks: current.tasks.map((task) => {
          const nextSortOrder = sortOrders.get(task.id);
          if (task.id === taskId) {
            return updateTask(
              task,
              { ...QUADRANT_FLAGS[destination], sortOrder: nextSortOrder ?? 0 },
              now,
            );
          }
          return nextSortOrder === undefined ? task : { ...task, sortOrder: nextSortOrder };
        }),
      };
    });
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importState(file);
      setState(imported);
      closeTaskEditor();
      setNotice({
        tone: "success",
        message: `Imported ${imported.tasks.length} ${imported.tasks.length === 1 ? "task" : "tasks"}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "The board could not be imported.",
      });
    }
  };

  const handleExport = () => {
    try {
      exportState(state);
      setNotice({ tone: "success", message: "Board exported as JSON." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "The board could not be exported.",
      });
    }
  };

  const clearFilters = () => {
    updateState({ filters: freshDefaultFilters() });
  };

  const viewProps = {
    tasks: visibleTasks,
    onEdit: openTaskEditor,
    onToggleComplete: toggleCompletion,
    onDelete: confirmAndRemoveTask,
  };

  let boardContent: ReactNode;
  if (state.tasks.length === 0) {
    boardContent = <EmptyState variant="global" onAction={openNewTask} />;
  } else if (visibleTasks.length === 0) {
    const onlySearchIsActive = !hasActiveFilters(state.filters) && state.searchQuery.length > 0;
    boardContent = (
      <EmptyState
        variant="filtered"
        onAction={onlySearchIsActive ? () => updateState({ searchQuery: "" }) : clearFilters}
        actionLabel={onlySearchIsActive ? "Clear search" : undefined}
      />
    );
  } else if (state.activeView === "kanban") {
    boardContent = <KanbanView {...viewProps} onMoveTask={moveKanbanTask} />;
  } else if (state.activeView === "matrix") {
    boardContent = <MatrixView {...viewProps} onMoveTask={moveMatrixTask} />;
  } else {
    boardContent = <ListView {...viewProps} />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        activeView={state.activeView}
        searchQuery={state.searchQuery}
        totalTasks={state.tasks.length}
        visibleTasks={visibleTasks.length}
        onViewChange={(activeView: AppView) => updateState({ activeView })}
        onSearchChange={(searchQuery) => updateState({ searchQuery })}
        onAddTask={openNewTask}
        onImport={handleImport}
        onExport={handleExport}
      />
      <FilterBar
        filters={state.filters}
        availableTags={availableTags}
        onFiltersChange={(filters) => updateState({ filters })}
        onClear={clearFilters}
      />

      <main className="app-main">
        {notice ? (
          <div
            className={`app-notice${notice.tone === "success" ? " app-notice--success" : ""}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <span>{notice.message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {boardContent}
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        task={editingTask}
        onSave={saveTask}
        onClose={closeTaskEditor}
        onDelete={editingTask ? removeTask : undefined}
      />
    </div>
  );
}
