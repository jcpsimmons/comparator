import { useSortable } from "@dnd-kit/sortable";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  GripVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  formatDueDate,
  getQuadrant,
  getQuadrantLabel,
  getStatusLabel,
  isDueToday,
  isDueWithinNext7Days,
  isOverdue,
} from "../taskUtils";
import type { QuadrantKey, Task, TaskStatus } from "../types";
import { Badge } from "./Badge";

export type TaskCardDragData =
  | { groupType: "status"; groupId: TaskStatus }
  | { groupType: "quadrant"; groupId: QuadrantKey };

export type TaskCardCompletionControl = "button" | "checkbox";

export type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  dragData?: TaskCardDragData;
  dragDisabled?: boolean;
  compact?: boolean;
  completionControl?: TaskCardCompletionControl;
};

const STATUS_TONES: Record<TaskStatus, "neutral" | "blue" | "amber" | "green"> = {
  backlog: "neutral",
  todo: "blue",
  inProgress: "amber",
  done: "green",
};

const QUADRANT_TONES: Record<QuadrantKey, "neutral" | "red" | "blue" | "amber"> = {
  doNow: "red",
  schedule: "blue",
  delegate: "amber",
  eliminate: "neutral",
};

export function TaskCard({
  task,
  onEdit,
  onToggleComplete,
  onDelete,
  dragData,
  dragDisabled = false,
  compact = false,
  completionControl = "button",
}: TaskCardProps) {
  const sortable = useSortable({
    id: task.id,
    disabled: dragDisabled || !dragData,
    data: dragData ? { type: "task", taskId: task.id, ...dragData } : undefined,
  });
  const quadrant = getQuadrant(task);
  const isComplete = task.status === "done";
  const dueLabel = task.dueDate ? formatDueDate(task) : null;
  const dueTone = isComplete
    ? "neutral"
    : isOverdue(task)
      ? "red"
      : isDueToday(task)
        ? "amber"
        : isDueWithinNext7Days(task)
          ? "blue"
          : "neutral";

  const transform = sortable.transform;
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.45 : undefined,
    zIndex: sortable.isDragging ? 2 : undefined,
  };

  const cardClassName = [
    "task-card",
    compact ? "task-card--compact" : "",
    isComplete ? "task-card--complete" : "",
    sortable.isDragging ? "task-card--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={sortable.setNodeRef}
      style={style}
      className={cardClassName}
      aria-label={`${task.title}, ${getStatusLabel(task.status)}, ${getQuadrantLabel(quadrant)}`}
    >
      <div className="task-card__header">
        {dragData && !dragDisabled ? (
          <button
            ref={sortable.setActivatorNodeRef}
            className="task-card__drag-handle icon-button"
            type="button"
            aria-label={`Drag ${task.title}`}
            title="Drag to reorder"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical aria-hidden="true" />
          </button>
        ) : null}

        <h3 className="task-card__title">{task.title}</h3>

        {isComplete ? (
          <span className="task-card__completion">
            <CheckCircle2 aria-hidden="true" />
            <span>Completed</span>
          </span>
        ) : null}
      </div>

      {task.description ? <p className="task-card__description">{task.description}</p> : null}

      <div className="task-card__badges">
        <Badge tone={STATUS_TONES[task.status]}>{getStatusLabel(task.status)}</Badge>
        <Badge tone={QUADRANT_TONES[quadrant]}>{getQuadrantLabel(quadrant)}</Badge>
        {dueLabel ? (
          <Badge tone={dueTone} className="task-card__due-badge">
            <CalendarDays aria-hidden="true" />
            {dueLabel}
          </Badge>
        ) : null}
      </div>

      {task.tags.length > 0 ? (
        <ul className="task-card__tags" aria-label="Tags">
          {task.tags.map((tag) => (
            <li key={tag.toLocaleLowerCase()}>
              <Badge tone="neutral">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="task-card__actions">
        <button
          className="icon-button"
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
          title="Edit task"
        >
          <Pencil aria-hidden="true" />
        </button>

        {completionControl === "checkbox" ? (
          <label className="task-card__completion-checkbox">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={() => onToggleComplete(task)}
              aria-label={`${isComplete ? "Reopen" : "Complete"} ${task.title}`}
            />
            <span>Done</span>
          </label>
        ) : (
          <button
            className="icon-button"
            type="button"
            onClick={() => onToggleComplete(task)}
            aria-label={`${isComplete ? "Reopen" : "Mark done"} ${task.title}`}
            title={isComplete ? "Reopen task" : "Mark task done"}
          >
            {isComplete ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
          </button>
        )}

        <button
          className="icon-button icon-button--danger"
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          title="Delete task"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
