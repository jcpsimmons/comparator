import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo } from "react";
import { STATUS_LABELS, STATUS_ORDER } from "../constants";
import { sortTasksByOrder } from "../taskUtils";
import type { Task, TaskStatus } from "../types";
import { TaskCard } from "./TaskCard";

export type KanbanMoveHandler = (
  taskId: string,
  destination: TaskStatus,
  beforeTaskId: string | null,
) => void;

export type KanbanViewProps = {
  tasks: Task[];
  onMoveTask: KanbanMoveHandler;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function KanbanColumn({ status, tasks, onEdit, onToggleComplete, onDelete }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `status:${status}`,
    data: { type: "status", status },
  });

  return (
    <section
      className={`kanban-column kanban-column--${status}`}
      aria-labelledby={`status-${status}`}
    >
      <header className="kanban-column__header">
        <h2 id={`status-${status}`}>{STATUS_LABELS[status]}</h2>
        <span className="kanban-column__count" role="status" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`kanban-column__dropzone${isOver ? " kanban-column__dropzone--over" : ""}`}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dragData={{ groupType: "status", groupId: status }}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? <p className="group-empty-state">Drop tasks here</p> : null}
      </div>
    </section>
  );
}

function getDestination(event: DragEndEvent): TaskStatus | null {
  const overData = event.over?.data.current;
  if (!overData) return null;

  if (overData.type === "status") return overData.status as TaskStatus;
  if (overData.type === "task" && overData.groupType === "status") {
    return overData.groupId as TaskStatus;
  }
  return null;
}

function getBeforeTaskId(
  event: DragEndEvent,
  destinationTasks: readonly Task[],
  source: TaskStatus,
  destination: TaskStatus,
): string | null | undefined {
  const over = event.over;
  if (over?.data.current?.type !== "task") return null;

  const activeId = String(event.active.id);
  const overId = String(over.id);
  if (activeId === overId) return undefined;

  const overIndex = destinationTasks.findIndex((task) => task.id === overId);
  if (overIndex < 0) return null;

  if (source === destination) {
    const activeIndex = destinationTasks.findIndex((task) => task.id === activeId);
    if (activeIndex < 0 || activeIndex === overIndex) return undefined;
    return activeIndex < overIndex ? (destinationTasks[overIndex + 1]?.id ?? null) : overId;
  }

  const translated = event.active.rect.current.translated;
  const droppedBelowTarget = translated
    ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
    : false;

  return droppedBelowTarget ? (destinationTasks[overIndex + 1]?.id ?? null) : overId;
}

export function KanbanView({
  tasks,
  onMoveTask,
  onEdit,
  onToggleComplete,
  onDelete,
}: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksByStatus = useMemo(() => {
    const grouped = {} as Record<TaskStatus, Task[]>;
    for (const status of STATUS_ORDER) {
      grouped[status] = sortTasksByOrder(tasks.filter((task) => task.status === status));
    }
    return grouped;
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current;
    if (!event.over || activeData?.type !== "task" || activeData.groupType !== "status") return;

    const destination = getDestination(event);
    if (!destination) return;

    const source = activeData.groupId as TaskStatus;
    const beforeTaskId = getBeforeTaskId(event, tasksByStatus[destination], source, destination);
    if (beforeTaskId === undefined) return;

    onMoveTask(String(event.active.id), destination, beforeTaskId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <section className="kanban-board" aria-label="Kanban board">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </section>
    </DndContext>
  );
}

export default KanbanView;
