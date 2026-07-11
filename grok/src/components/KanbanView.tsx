import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { STATUS_LABELS, TASK_STATUSES } from "../constants";
import { sortTasksInGroup } from "../taskUtils";
import type { Task, TaskStatus } from "../types";
import { TaskCard } from "./TaskCard";

type KanbanViewProps = {
  tasks: Task[];
  onMove: (taskId: string, status: TaskStatus, index: number) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function Column({
  status,
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const ids = tasks.map((t) => t.id);

  return (
    <section
      className={`kanban-column${isOver ? " is-over" : ""}`}
      data-status={status}
      aria-label={STATUS_LABELS[status]}
    >
      <header className="column-header">
        <h2>{STATUS_LABELS[status]}</h2>
        <span className="count-badge" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>
      <div ref={setNodeRef} className="column-body">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="drop-hint">Drop tasks here</p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

export function KanbanView({
  tasks,
  onMove,
  onEdit,
  onToggleComplete,
  onDelete,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      inProgress: [],
      done: [],
    };
    for (const t of tasks) {
      map[t.status].push(t);
    }
    for (const s of TASK_STATUSES) {
      map[s] = sortTasksInGroup(map[s]);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    let targetStatus: TaskStatus | null = null;
    let targetIndex = 0;

    if (overId.startsWith("column-")) {
      targetStatus = overId.replace("column-", "") as TaskStatus;
      targetIndex = byStatus[targetStatus].filter((t) => t.id !== taskId).length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
      const column = byStatus[targetStatus].filter((t) => t.id !== taskId);
      const idx = column.findIndex((t) => t.id === overId);
      targetIndex = idx >= 0 ? idx : column.length;
    }

    if (!targetStatus) return;
    onMove(taskId, targetStatus, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="kanban-board" data-view="kanban">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus[status]}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="task-card drag-overlay-card">
            <h3 className="task-card-title">{activeTask.title}</h3>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
