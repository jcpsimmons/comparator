import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "./Badge";
import {
  formatDueDate,
  getDueBadgeVariant,
  getQuadrant,
  getQuadrantLabel,
  getStatusLabel,
} from "../taskUtils";
import type { Task } from "../types";

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  draggable?: boolean;
};

export function TaskCard({
  task,
  onEdit,
  onToggleComplete,
  onDelete,
  draggable = true,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const quadrant = getQuadrant(task);
  const dueLabel = formatDueDate(task);
  const dueVariant = getDueBadgeVariant(task);
  const isDone = task.status === "done" || !!task.completedAt;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card${isDragging ? " is-dragging" : ""}${isDone ? " is-done" : ""}`}
      data-task-id={task.id}
      {...(draggable ? { ...attributes, ...listeners } : {})}
    >
      <div className="task-card-header">
        <h3 className="task-card-title">{task.title}</h3>
        {isDone ? (
          <span className="task-card-done-mark" aria-label="Completed">
            <Check size={14} aria-hidden />
          </span>
        ) : null}
      </div>

      {task.description ? (
        <p className="task-card-desc">{task.description}</p>
      ) : null}

      <div className="task-card-badges">
        <Badge variant="status">{getStatusLabel(task.status)}</Badge>
        <Badge variant={quadrant}>{getQuadrantLabel(quadrant)}</Badge>
        {dueLabel && dueVariant ? (
          <Badge variant={dueVariant === "neutral" ? "default" : dueVariant}>
            {dueLabel}
          </Badge>
        ) : null}
      </div>

      {task.tags.length > 0 ? (
        <div className="task-card-tags">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="tag">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="task-card-actions">
        <button
          type="button"
          className="btn btn-icon"
          aria-label={`Edit ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label={isDone ? `Reopen ${task.title}` : `Mark ${task.title} done`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isDone ? <RotateCcw size={14} aria-hidden /> : <Check size={14} aria-hidden />}
        </button>
        <button
          type="button"
          className="btn btn-icon btn-danger"
          aria-label={`Delete ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
    </article>
  );
}
