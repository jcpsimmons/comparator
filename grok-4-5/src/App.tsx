import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { KanbanView } from "./components/KanbanView";
import { ListView } from "./components/ListView";
import { MatrixView } from "./components/MatrixView";
import { TaskModal, type TaskFormValues } from "./components/TaskModal";
import { createDefaultFilters } from "./constants";
import {
  downloadJson,
  exportState,
  importState,
  loadState,
  saveState,
} from "./storage";
import {
  applyKanbanDrop,
  applyMatrixDrop,
  collectAllTags,
  createTask,
  filterTasks,
  maxSortOrder,
  normalizeTags,
  toggleComplete,
  updateTask,
} from "./taskUtils";
import type { AppState, AppView, Filters, QuadrantKey, Task, TaskStatus } from "./types";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState().state);
  const [banner, setBanner] = useState<string | null>(() => {
    const result = loadState();
    return result.ok ? null : result.error;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    try {
      saveState(state);
    } catch {
      setBanner("Unable to save state to local storage.");
    }
  }, [state]);

  const visibleTasks = useMemo(
    () => filterTasks(state.tasks, state.searchQuery, state.filters),
    [state.tasks, state.searchQuery, state.filters],
  );

  const availableTags = useMemo(
    () => collectAllTags(state.tasks),
    [state.tasks],
  );

  const filtersActive =
    state.filters.statuses.length > 0 ||
    state.filters.quadrants.length > 0 ||
    state.filters.tags.length > 0 ||
    state.filters.due !== "all" ||
    state.filters.completion !== "all";

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setModalMode("edit");
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSave = (values: TaskFormValues) => {
    const tags = normalizeTags(values.tags);
    const dueDate = values.dueDate || null;

    if (modalMode === "create") {
      updateState((prev) => {
        const task = createTask(
          {
            title: values.title,
            description: values.description,
            status: values.status,
            urgent: values.urgent,
            important: values.important,
            dueDate,
            tags,
          },
          { existingMaxSortOrder: maxSortOrder(prev.tasks) },
        );
        return { ...prev, tasks: [...prev.tasks, task] };
      });
    } else if (editingTask) {
      updateState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === editingTask.id
            ? updateTask(t, {
                title: values.title,
                description: values.description,
                status: values.status,
                urgent: values.urgent,
                important: values.important,
                dueDate,
                tags,
              })
            : t,
        ),
      }));
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = (task: Task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      return;
    }
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== task.id),
    }));
    if (editingTask?.id === task.id) {
      setModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleToggleComplete = (task: Task) => {
    updateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id ? toggleComplete(t) : t,
      ),
    }));
  };

  const handleKanbanMove = (taskId: string, status: TaskStatus, index: number) => {
    updateState((prev) => ({
      ...prev,
      tasks: applyKanbanDrop(prev.tasks, taskId, status, index),
    }));
  };

  const handleMatrixMove = (
    taskId: string,
    quadrant: QuadrantKey,
    index: number,
  ) => {
    updateState((prev) => ({
      ...prev,
      tasks: applyMatrixDrop(prev.tasks, taskId, quadrant, index),
    }));
  };

  const handleExport = () => {
    const { filename, json } = exportState(state);
    downloadJson(filename, json);
  };

  const handleImport = async (file: File) => {
    const result = await importState(file);
    if (!result.ok) {
      setBanner(result.error);
      return;
    }
    setState(result.state);
    setBanner("Board imported successfully.");
  };

  const setView = (view: AppView) => {
    updateState((prev) => ({ ...prev, activeView: view }));
  };

  const setSearch = (searchQuery: string) => {
    updateState((prev) => ({ ...prev, searchQuery }));
  };

  const setFilters = (filters: Filters) => {
    updateState((prev) => ({ ...prev, filters }));
  };

  const clearFilters = () => {
    updateState((prev) => ({ ...prev, filters: createDefaultFilters() }));
  };

  const showGlobalEmpty = state.tasks.length === 0;
  const showFilteredEmpty =
    !showGlobalEmpty && visibleTasks.length === 0;

  return (
    <div className="app-shell">
      <AppHeader
        activeView={state.activeView}
        searchQuery={state.searchQuery}
        onViewChange={setView}
        onSearchChange={setSearch}
        onAddTask={openCreate}
        onExport={handleExport}
        onImportFile={handleImport}
        totalTasks={state.tasks.length}
        visibleTasks={visibleTasks.length}
        filtersActive={filtersActive}
      />

      <FilterBar
        filters={state.filters}
        availableTags={availableTags}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {banner ? (
        <div className="banner" role="status">
          <span>{banner}</span>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Dismiss message"
            onClick={() => setBanner(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <main className="app-main">
        {showGlobalEmpty ? (
          <EmptyState
            title="No tasks yet"
            description="Create your first task to start organizing work by status and priority."
            actionLabel="Add Task"
            onAction={openCreate}
          />
        ) : showFilteredEmpty ? (
          <EmptyState
            title="No tasks match the current filters"
            description="Try adjusting search or filters to see more tasks."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : state.activeView === "kanban" ? (
          <KanbanView
            tasks={visibleTasks}
            onMove={handleKanbanMove}
            onEdit={openEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
          />
        ) : state.activeView === "matrix" ? (
          <MatrixView
            tasks={visibleTasks}
            onMove={handleMatrixMove}
            onEdit={openEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
          />
        ) : (
          <ListView
            tasks={visibleTasks}
            onEdit={openEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
          />
        )}
      </main>

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initial={editingTask}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        onDelete={
          editingTask
            ? () => handleDelete(editingTask)
            : undefined
        }
      />
    </div>
  );
}
