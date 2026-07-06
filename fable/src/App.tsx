import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { AppHeader } from "./components/AppHeader";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { KanbanView } from "./components/KanbanView";
import { ListView } from "./components/ListView";
import { MatrixView } from "./components/MatrixView";
import { TaskModal } from "./components/TaskModal";
import { DEFAULT_FILTERS } from "./constants";
import { exportState, importState, loadState, saveState } from "./storage";
import { createTask, filterTasks, moveTask, updateTask } from "./taskUtils";
import type { AppState, AppView, DropTarget, Filters, Task, TaskDraft } from "./types";

type Notice = { type: "info" | "error"; text: string };

type ModalState = { open: false } | { open: true; task: Task | null };

export default function App() {
  const [initial] = useState(() => loadState());
  const [state, setState] = useState<AppState>(initial.state);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [notice, setNotice] = useState<Notice | null>(
    initial.corrupted
      ? {
          type: "error",
          text: "Saved data was corrupt and has been reset. A backup of the raw data was kept in local storage.",
        }
      : null
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visibleTasks = useMemo(
    () => filterTasks(state.tasks, state.searchQuery, state.filters),
    [state.tasks, state.searchQuery, state.filters]
  );

  const allTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const task of state.tasks) {
      for (const tag of task.tags) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) seen.set(key, tag);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [state.tasks]);

  const setView = useCallback((view: AppView) => {
    setState((s) => ({ ...s, activeView: view }));
  }, []);

  const setSearch = useCallback((query: string) => {
    setState((s) => ({ ...s, searchQuery: query }));
  }, []);

  const setFilters = useCallback((filters: Filters) => {
    setState((s) => ({ ...s, filters }));
  }, []);

  const clearFilters = useCallback(() => {
    setState((s) => ({ ...s, filters: { ...DEFAULT_FILTERS } }));
  }, []);

  const openCreateModal = useCallback(() => setModal({ open: true, task: null }), []);
  const openEditModal = useCallback((task: Task) => setModal({ open: true, task }), []);
  const closeModal = useCallback(() => setModal({ open: false }), []);

  const handleSaveTask = useCallback(
    (draft: TaskDraft) => {
      setState((s) => {
        if (modal.open && modal.task) {
          const editingId = modal.task.id;
          return {
            ...s,
            tasks: s.tasks.map((t) => (t.id === editingId ? updateTask(t, draft) : t)),
          };
        }
        return { ...s, tasks: [...s.tasks, createTask(draft, s.tasks)] };
      });
      setModal({ open: false });
    },
    [modal]
  );

  const handleToggleDone = useCallback((task: Task) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== task.id) return t;
        return t.status === "done"
          ? updateTask(t, { status: "todo" })
          : updateTask(t, { status: "done" });
      }),
    }));
  }, []);

  const handleDeleteTask = useCallback((task: Task) => {
    const confirmed = window.confirm(`Delete "${task.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }));
    setModal((m) => (m.open && m.task?.id === task.id ? { open: false } : m));
  }, []);

  const handleTaskDrop = useCallback(
    (taskId: string, target: DropTarget, overTaskId: string | null) => {
      setState((s) => ({ ...s, tasks: moveTask(s.tasks, taskId, target, overTaskId) }));
    },
    []
  );

  const handleExport = useCallback(() => {
    exportState(state);
  }, [state]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const imported = await importState(file);
      setState(imported);
      setNotice({ type: "info", text: "Board imported successfully." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }, []);

  const searchActive = state.searchQuery.trim().length > 0;
  const viewProps = {
    tasks: visibleTasks,
    onEdit: openEditModal,
    onToggleDone: handleToggleDone,
    onDelete: handleDeleteTask,
  };

  let content;
  if (state.tasks.length === 0) {
    content = (
      <EmptyState
        title="No tasks yet"
        action={
          <button type="button" className="button button-primary" onClick={openCreateModal}>
            <Plus size={15} aria-hidden="true" />
            <span>Add Task</span>
          </button>
        }
      />
    );
  } else if (visibleTasks.length === 0) {
    content = (
      <EmptyState
        title="No tasks match the current filters"
        action={
          <button type="button" className="button" onClick={clearFilters}>
            Clear filters
          </button>
        }
      />
    );
  } else if (state.activeView === "kanban") {
    content = <KanbanView {...viewProps} onTaskDrop={handleTaskDrop} />;
  } else if (state.activeView === "matrix") {
    content = <MatrixView {...viewProps} onTaskDrop={handleTaskDrop} />;
  } else {
    content = <ListView {...viewProps} />;
  }

  return (
    <div className="app">
      <AppHeader
        activeView={state.activeView}
        searchQuery={state.searchQuery}
        onViewChange={setView}
        onSearchChange={setSearch}
        onAddTask={openCreateModal}
        onExport={handleExport}
        onImportFile={handleImportFile}
      />
      <FilterBar
        filters={state.filters}
        allTags={allTags}
        totalCount={state.tasks.length}
        visibleCount={visibleTasks.length}
        searchActive={searchActive}
        onChange={setFilters}
        onClear={clearFilters}
      />
      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <main className="main">{content}</main>
      {modal.open && (
        <TaskModal
          task={modal.task}
          onSave={handleSaveTask}
          onCancel={closeModal}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
