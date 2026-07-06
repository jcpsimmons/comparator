import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import {
  Check,
  Calendar,
  Edit2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Badge, type BadgeVariant } from "./Badge";
import {
  formatDueDate,
  getQuadrant,
  isDueToday,
  isOverdue,
} from "../taskUtils";
import {
  QUADRANT_LABELS,
  STATUS_LABELS,
  ACCENT_COLORS,
} from "../constants";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  draggable?: boolean;
}

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

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const quadrant = getQuadrant(task);
  const accent = ACCENT_COLORS[quadrant];
  const isDone = task.status === "done";
  const dueLabel = formatDueDate(task);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card accent-${accent}${isDone ? " is-done" : ""}`}
      {...attributes}
    >
      <div className="task-card-header" {...listeners}>
        <span className="task-card-drag-handle" aria-hidden="true" />
        <h4 className="task-card-title">{task.title}</h4>
      </div>

      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      <div className="task-card-badges">
        <Badge variant={statusVariant(task.status)} title="Workflow status">
          {STATUS_LABELS[task.status]}
        </Badge>
        <Badge variant={accent} title="Eisenhower quadrant">
          {QUADRANT_LABELS[quadrant]}
        </Badge>
        {dueLabel && (
          <Badge
            variant={
              overdue ? "red" : dueToday ? "amber" : "neutral"
            }
            title="Due date"
          >
            <Calendar size={12} aria-hidden="true" /> {dueLabel}
          </Badge>
        )}
        {isDone && (
          <Badge variant="green" title="Completed">
            <Check size={12} aria-hidden="true" /> Done
          </Badge>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="task-card-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="task-card-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Edit task"
          onClick={() => onEdit(task)}
        >
          <Edit2 size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={isDone ? "Reopen task" : "Mark task done"}
          onClick={() => onToggleComplete(task)}
        >
          {isDone ? (
            <RotateCcw size={14} aria-hidden="true" />
          ) : (
            <Check size={14} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          aria-label="Delete task"
          onClick={() => onDelete(task)}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function statusVariant(status: Task["status"]): BadgeVariant {
  switch (status) {
    case "done":
      return "green";
    case "inProgress":
      return "blue";
    case "todo":
      return "amber";
    default:
      return "gray";
  }
}
