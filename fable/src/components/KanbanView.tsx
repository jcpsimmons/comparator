import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STATUS_LABELS, STATUS_ORDER } from "../constants";
import { sortByGroupOrder } from "../taskUtils";
import { SortableTaskCard } from "./SortableTaskCard";
import { TaskCard } from "./TaskCard";
import type { DropTarget, Task, TaskStatus } from "../types";

type KanbanViewProps = {
  tasks: Task[];
  onTaskDrop: (taskId: string, target: DropTarget, overTaskId: string | null) => void;
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const COLUMN_ID_PREFIX = "status:";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function KanbanColumn({ status, tasks, onEdit, onToggleDone, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_ID_PREFIX}${status}` });

  return (
    <section className="board-column" aria-label={`${STATUS_LABELS[status]} column`}>
      <header className="board-column-header">
        <h2 className="board-column-title">{STATUS_LABELS[status]}</h2>
        <span className="board-column-count" aria-label={`${tasks.length} tasks visible`}>
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`board-column-body${isOver ? " board-column-body-over" : ""}`}
        >
          {tasks.length === 0 && <p className="drop-hint">Drop tasks here</p>}
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              showStatus={false}
              onEdit={onEdit}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanView({ tasks, onTaskDrop, onEdit, onToggleDone, onDelete }: KanbanViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = useMemo(() => {
    const byStatus = new Map<TaskStatus, Task[]>(STATUS_ORDER.map((s) => [s, []]));
    for (const task of tasks) {
      byStatus.get(task.status)?.push(task);
    }
    return STATUS_ORDER.map((status) => ({
      status,
      tasks: sortByGroupOrder(byStatus.get(status) ?? []),
    }));
  }, [tasks]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(taskById.get(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith(COLUMN_ID_PREFIX)) {
      const status = overId.slice(COLUMN_ID_PREFIX.length) as TaskStatus;
      onTaskDrop(activeId, { type: "status", value: status }, null);
      return;
    }
    const overTask = taskById.get(overId);
    if (!overTask) return;
    onTaskDrop(activeId, { type: "status", value: overTask.status }, overId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="kanban-grid">
        {columns.map(({ status, tasks: columnTasks }) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columnTasks}
            onEdit={onEdit}
            onToggleDone={onToggleDone}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            showStatus={false}
            onEdit={() => {}}
            onToggleDone={() => {}}
            onDelete={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
