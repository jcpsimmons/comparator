import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { STATUS_COLUMN_ORDER, STATUS_LABELS } from "../constants";
import { sortTasksForColumn } from "../taskUtils";
import type { Task, TaskStatus } from "../types";

interface KanbanViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanView({
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: KanbanViewProps) {
  return (
    <div className="kanban">
      {STATUS_COLUMN_ORDER.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          onEdit={onEdit}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `kanban-${status}` });
  const sorted = sortTasksForColumn(tasks);
  const ids = sorted.map((t) => t.id);

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column${isOver ? " is-over" : ""}`}
      aria-label={`${STATUS_LABELS[status]} column`}
    >
      <header className="kanban-column-header">
        <h3>{STATUS_LABELS[status]}</h3>
        <span className="count-badge" aria-label={`${sorted.length} tasks`}>
          {sorted.length}
        </span>
      </header>
      <div className="kanban-column-body">
        <SortableContext
          items={ids}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {sorted.length === 0 && (
          <p className="drop-hint">Drop tasks here</p>
        )}
      </div>
    </section>
  );
}
