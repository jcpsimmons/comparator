import type { CSSProperties, HTMLAttributes } from "react";
import { Calendar, Check, Circle, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QUADRANT_META, STATUS_META } from "../constants";
import { dueClassName, formatDueDate, getQuadrant, getQuadrantLabel, getStatusLabel } from "../taskUtils";
import type { QuadrantKey, Task, TaskStatus } from "../types";
import { Badge } from "./Badge";

type DragData = {
  setNodeRef: (node: HTMLElement | null) => void;
  attributes: HTMLAttributes<HTMLElement>;
  listeners: HTMLAttributes<HTMLElement> | undefined;
  style: CSSProperties;
  isDragging: boolean;
};

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  drag?: DragData;
  compact?: boolean;
};

function isDone(task: Task): boolean {
  return task.status === "done" || task.completedAt !== null;
}

function stopActionDrag(event: React.PointerEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function TaskCard({ task, onEdit, onToggleComplete, onDelete, drag, compact = false }: TaskCardProps) {
  const quadrant = getQuadrant(task);
  const dueLabel = formatDueDate(task);
  const done = isDone(task);

  return (
    <article
      ref={drag?.setNodeRef}
      className={`task-card ${compact ? "task-card-compact" : ""} ${drag?.isDragging ? "is-dragging" : ""}`.trim()}
      style={drag?.style}
      {...drag?.attributes}
      {...drag?.listeners}
    >
      <div className="task-card-header">
        <div className="task-title-group">
          <div className="completion-line">
            <span className={`completion-dot ${done ? "is-complete" : ""}`} aria-hidden="true">
              {done ? <Check size={14} /> : <Circle size={12} />}
            </span>
            <h3>{task.title}</h3>
          </div>
        </div>
        <div className="card-actions" aria-label={`Actions for ${task.title}`}>
          <button type="button" className="icon-button" aria-label={`Edit ${task.title}`} onPointerDown={stopActionDrag} onClick={() => onEdit(task)}>
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
            onPointerDown={stopActionDrag}
            onClick={() => onToggleComplete(task)}
          >
            {done ? <RotateCcw size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button danger" aria-label={`Delete ${task.title}`} onPointerDown={stopActionDrag} onClick={() => onDelete(task)}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {task.description ? <p className="task-description">{task.description}</p> : null}

      <div className="badge-row">
        <Badge className={STATUS_META[task.status].className}>{getStatusLabel(task.status)}</Badge>
        <Badge className={QUADRANT_META[quadrant].className}>{getQuadrantLabel(quadrant)}</Badge>
        {dueLabel ? (
          <Badge className={dueClassName(task)}>
            <Calendar size={13} aria-hidden="true" />
            {dueLabel}
          </Badge>
        ) : null}
        {done ? <Badge className="status-done">Done</Badge> : <Badge className="status-open">Open</Badge>}
      </div>

      {task.tags.length > 0 ? (
        <div className="tag-row" aria-label={`Tags: ${task.tags.join(", ")}`}>
          {task.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

type SortableTaskCardProps = Omit<TaskCardProps, "drag"> & {
  group: TaskStatus | QuadrantKey;
};

export function SortableTaskCard(props: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: {
      type: "task",
      taskId: props.task.id,
      group: props.group,
    },
  });

  return (
    <TaskCard
      {...props}
      drag={{
        setNodeRef,
        attributes,
        listeners,
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
        },
        isDragging,
      }}
    />
  );
}
