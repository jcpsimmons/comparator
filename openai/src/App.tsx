import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { DEFAULT_FILTERS, QUADRANT_META } from "./constants";
import { exportState, importState, loadState, saveState } from "./storage";
import {
  createTask,
  filterTasks,
  getQuadrant,
  hasActiveFilters,
  sortTasksForBoard,
  updateTask,
} from "./taskUtils";
import type { AppState, QuadrantKey, Task, TaskFormValues, TaskStatus } from "./types";
import { AppHeader } from "./components/AppHeader";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { KanbanView } from "./components/KanbanView";
import { ListView } from "./components/ListView";
import { MatrixView } from "./components/MatrixView";
import { TaskModal } from "./components/TaskModal";

type MoveOptions = {
  taskId: string;
  overTaskId: string | null;
  targetGroup: string;
  patch: Partial<TaskFormValues>;
  getGroup: (task: Task) => string;
};

function isTaskDone(task: Task): boolean {
  return task.status === "done" || task.completedAt !== null;
}

function reorderAfterDrop(tasks: Task[], { taskId, overTaskId, targetGroup, patch, getGroup }: MoveOptions): Task[] {
  const activeTask = tasks.find((task) => task.id === taskId);
  if (!activeTask) return tasks;

  const sourceGroup = getGroup(activeTask);
  if (sourceGroup === targetGroup && overTaskId === taskId) {
    return tasks;
  }

  const updatedActiveTask = updateTask(activeTask, patch);
  const withUpdatedTask = tasks.map((task) => (task.id === taskId ? updatedActiveTask : task));
  const destinationTasks = sortTasksForBoard(withUpdatedTask.filter((task) => getGroup(task) === targetGroup && task.id !== taskId));
  const overIndex = overTaskId ? destinationTasks.findIndex((task) => task.id === overTaskId) : -1;
  const insertIndex = overIndex >= 0 ? overIndex : destinationTasks.length;
  const reorderedDestination = [
    ...destinationTasks.slice(0, insertIndex),
    updatedActiveTask,
    ...destinationTasks.slice(insertIndex),
  ];
  const orderById = new Map(reorderedDestination.map((task, index) => [task.id, (index + 1) * 1000]));

  return withUpdatedTask.map((task) => {
    const sortOrder = orderById.get(task.id);
    return sortOrder === undefined ? task : { ...task, sortOrder };
  });
}

function deleteConfirmed(task: Task): boolean {
  return window.confirm(`Delete "${task.title}"? This cannot be undone.`);
}

export default function App() {
  const [initialLoad] = useState(() => loadState());
  const [state, setState] = useState<AppState>(initialLoad.state);
  const [message, setMessage] = useState<string | null>(initialLoad.notice);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const visibleTasks = useMemo(() => filterTasks(state.tasks, state.searchQuery, state.filters), [state.tasks, state.searchQuery, state.filters]);
  const tags = useMemo(() => {
    const seen = new Set<string>();
    const allTags: string[] = [];

    for (const task of state.tasks) {
      for (const tag of task.tags) {
        const key = tag.toLocaleLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allTags.push(tag);
        }
      }
    }

    return allTags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [state.tasks]);

  const hasSearchOrFilters = state.searchQuery.trim().length > 0 || hasActiveFilters(state.filters);

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = (values: TaskFormValues, taskId?: string) => {
    setState((current) => {
      if (!taskId) {
        return {
          ...current,
          tasks: [...current.tasks, createTask(values, current.tasks)],
        };
      }

      return {
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? updateTask(task, values) : task)),
      };
    });
    closeModal();
  };

  const handleDeleteTask = (task: Task) => {
    if (!deleteConfirmed(task)) return;

    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((candidate) => candidate.id !== task.id),
    }));
    closeModal();
  };

  const handleToggleComplete = (task: Task) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((candidate) =>
        candidate.id === task.id ? updateTask(candidate, { status: isTaskDone(candidate) ? "todo" : "done" }) : candidate,
      ),
    }));
  };

  const handleKanbanDrop = (taskId: string, targetStatus: TaskStatus, overTaskId: string | null) => {
    setState((current) => ({
      ...current,
      tasks: reorderAfterDrop(current.tasks, {
        taskId,
        overTaskId,
        targetGroup: targetStatus,
        patch: { status: targetStatus },
        getGroup: (task) => task.status,
      }),
    }));
  };

  const handleMatrixDrop = (taskId: string, targetQuadrant: QuadrantKey, overTaskId: string | null) => {
    const quadrant = QUADRANT_META[targetQuadrant];

    setState((current) => ({
      ...current,
      tasks: reorderAfterDrop(current.tasks, {
        taskId,
        overTaskId,
        targetGroup: targetQuadrant,
        patch: { urgent: quadrant.urgent, important: quadrant.important },
        getGroup: getQuadrant,
      }),
    }));
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;

    try {
      const importedState = await importState(file);
      setState(importedState);
      setMessage("Imported board data successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const renderCurrentView = () => {
    if (state.tasks.length === 0) {
      return (
        <EmptyState
          title="No tasks yet"
          description="Create the first task to start organizing work."
          action={
            <button type="button" className="primary-button" onClick={openCreateModal}>
              <Plus size={17} aria-hidden="true" />
              Add Task
            </button>
          }
        />
      );
    }

    if (visibleTasks.length === 0) {
      return (
        <EmptyState
          title="No tasks match the current filters"
          description="Adjust the search or clear filters to bring tasks back into view."
          action={
            <button type="button" className="secondary-button" onClick={() => setState((current) => ({ ...current, filters: DEFAULT_FILTERS }))}>
              Clear filters
            </button>
          }
        />
      );
    }

    if (state.activeView === "matrix") {
      return (
        <MatrixView
          tasks={visibleTasks}
          onTaskDrop={handleMatrixDrop}
          onEditTask={openEditModal}
          onToggleComplete={handleToggleComplete}
          onDeleteTask={handleDeleteTask}
        />
      );
    }

    if (state.activeView === "list") {
      return <ListView tasks={visibleTasks} onEditTask={openEditModal} onToggleComplete={handleToggleComplete} onDeleteTask={handleDeleteTask} />;
    }

    return (
      <KanbanView
        tasks={visibleTasks}
        onTaskDrop={handleKanbanDrop}
        onEditTask={openEditModal}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
      />
    );
  };

  return (
    <div className="app-shell">
      <AppHeader
        activeView={state.activeView}
        searchQuery={state.searchQuery}
        onViewChange={(activeView) => setState((current) => ({ ...current, activeView }))}
        onSearchChange={(searchQuery) => setState((current) => ({ ...current, searchQuery }))}
        onAddTask={openCreateModal}
        onImport={() => fileInputRef.current?.click()}
        onExport={() => exportState(state)}
      />

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />

      {message ? (
        <div className="notice" role="status">
          <span>{message}</span>
          <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setMessage(null)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <FilterBar
        filters={state.filters}
        allTags={tags}
        totalCount={state.tasks.length}
        visibleCount={visibleTasks.length}
        hasSearchOrFilters={hasSearchOrFilters}
        onFiltersChange={(filters) => setState((current) => ({ ...current, filters }))}
        onClearFilters={() => setState((current) => ({ ...current, filters: DEFAULT_FILTERS }))}
      />

      <main className="main-content">{renderCurrentView()}</main>

      <TaskModal task={editingTask} isOpen={isModalOpen} onClose={closeModal} onSave={handleSaveTask} onDelete={handleDeleteTask} />
    </div>
  );
}
