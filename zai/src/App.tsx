import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AppHeader } from "./components/AppHeader";
import { FilterBar } from "./components/FilterBar";
import { KanbanView } from "./components/KanbanView";
import { MatrixView } from "./components/MatrixView";
import { ListView } from "./components/ListView";
import { TaskModal } from "./components/TaskModal";
import { EmptyState } from "./components/EmptyState";
import { TaskCard } from "./components/TaskCard";
import { createDefaultFilters } from "./constants";
import {
  exportState,
  importState,
  loadState,
  saveState,
} from "./storage";
import {
  collectAllTags,
  createTask,
  filterTasks,
  getQuadrant,
  maxSortOrder,
  moveTaskToColumn,
  moveTaskToQuadrant,
  toggleComplete,
  updateTask,
} from "./taskUtils";
import type {
  AppView,
  AppState,
  Filters,
  Task,
  TaskInput,
  TaskStatus,
} from "./types";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 720px)").matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 720px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  return isMobile;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const firstLoadRef = useRef(true);

  // Persist on every change
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allTags = useMemo(
    () => collectAllTags(state.tasks),
    [state.tasks]
  );

  const visibleTasks = useMemo(
    () => filterTasks(state.tasks, state.searchQuery, state.filters),
    [state.tasks, state.searchQuery, state.filters]
  );

  const activeDragTask = useMemo(
    () => state.tasks.find((t) => t.id === activeDragId) ?? null,
    [state.tasks, activeDragId]
  );

  function handleViewChange(v: AppView) {
    setState((s) => ({ ...s, activeView: v }));
  }

  function handleSearchChange(q: string) {
    setState((s) => ({ ...s, searchQuery: q }));
  }

  function handleFiltersChange(next: Filters) {
    setState((s) => ({ ...s, filters: next }));
  }

  function handleClearFilters() {
    setState((s) => ({ ...s, filters: createDefaultFilters() }));
  }

  function openAddModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleSaveTask(input: TaskInput, id?: string) {
    setState((s) => {
      if (id) {
        const tasks = s.tasks.map((t) =>
          t.id === id ? updateTask(t, input) : t
        );
        return { ...s, tasks };
      }
      const targetStatus: TaskStatus = input.status;
      const maxOrder = maxSortOrder(
        s.tasks.filter((t) => t.status === targetStatus)
      );
      const newTask = createTask(input, maxOrder);
      return { ...s, tasks: [...s.tasks, newTask] };
    });
  }

  function handleToggleComplete(task: Task) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === task.id ? toggleComplete(t) : t
      ),
    }));
  }

  function handleDeleteTask(task: Task) {
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      setState((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== task.id),
      }));
    }
  }

  function handleDeleteFromModal(id: string) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
    }));
  }

  function handleExport() {
    exportState(state);
  }

  async function handleImport(file: File) {
    setImportError(null);
    try {
      const imported = await importState(file);
      setState(imported);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Import failed."
      );
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const targetId = String(over.id);

    // Kanban drops
    if (targetId.startsWith("kanban-")) {
      const status = targetId.replace("kanban-", "") as TaskStatus;
      const overData = over.data?.current as
        | { sortable?: { index?: number } }
        | undefined;
      const targetIndex = overData?.sortable?.index ?? null;
      setState((s) => moveTaskToColumn(s, taskId, status, targetIndex));
      return;
    }

    // Matrix drops
    if (targetId.startsWith("matrix-")) {
      const quadrant = targetId.replace("matrix-", "") as ReturnType<
        typeof getQuadrant
      >;
      setState((s) => moveTaskToQuadrant(s, taskId, quadrant));
      return;
    }

    // Same-column / same-quadrant reorder where over.id is a task id
    const activeTask = state.tasks.find((t) => t.id === taskId);
    if (!activeTask) return;
    const overTask = state.tasks.find((t) => t.id === targetId);
    if (!overTask) return;

    if (state.activeView === "kanban") {
      // Move to the status of the hovered task (handles same + cross column)
      const overData = over.data?.current as
        | { sortable?: { index?: number } }
        | undefined;
      const targetIndex = overData?.sortable?.index ?? null;
      setState((s) =>
        moveTaskToColumn(s, taskId, overTask.status, targetIndex)
      );
    } else if (state.activeView === "matrix") {
      const q = getQuadrant(overTask);
      setState((s) => moveTaskToQuadrant(s, taskId, q));
    }
  }

  const filtersActive =
    state.searchQuery.length > 0 ||
    state.filters.statuses.length > 0 ||
    state.filters.quadrants.length > 0 ||
    state.filters.tags.length > 0 ||
    state.filters.due !== "all" ||
    state.filters.completion !== "all";

  const noTasksAtAll = state.tasks.length === 0;
  const noVisibleTasks = visibleTasks.length === 0;

  return (
    <div className="app">
      <AppHeader
        activeView={state.activeView}
        searchQuery={state.searchQuery}
        onViewChange={handleViewChange}
        onSearchChange={handleSearchChange}
        onAddTask={openAddModal}
        onExport={handleExport}
        onImport={handleImport}
        importError={importError}
      />

      <FilterBar
        filters={state.filters}
        allTags={allTags}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      <main className="app-main">
        {filtersActive && (
          <div className="visible-summary" aria-live="polite">
            {state.tasks.length} task{state.tasks.length === 1 ? "" : "s"} ·{" "}
            {visibleTasks.length} visible
          </div>
        )}

        {noTasksAtAll ? (
          <EmptyState
            title="No tasks yet"
            message="Add your first task to get started."
            onAction={openAddModal}
            actionLabel="Add Task"
          />
        ) : noVisibleTasks ? (
          <EmptyState
            title="No tasks match the current filters"
            message="Try clearing filters or adjusting your search."
            onAction={handleClearFilters}
            actionLabel="Clear filters"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            {state.activeView === "kanban" && (
              <KanbanView
                tasks={visibleTasks}
                onEdit={openEditModal}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            )}
            {state.activeView === "matrix" && (
              <MatrixView
                tasks={visibleTasks}
                onEdit={openEditModal}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            )}
            {state.activeView === "list" && (
              <ListView
                tasks={visibleTasks}
                isMobile={isMobile}
                onEdit={openEditModal}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onAdd={openAddModal}
              />
            )}
            <DragOverlay>
              {activeDragTask ? (
                <div className="drag-overlay-card">
                  <TaskCard
                    task={activeDragTask}
                    onEdit={() => {}}
                    onToggleComplete={() => {}}
                    onDelete={() => {}}
                    draggable={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <TaskModal
        open={modalOpen}
        initial={editingTask}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteFromModal}
      />
    </div>
  );
}
