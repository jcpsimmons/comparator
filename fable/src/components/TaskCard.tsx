import { Calendar, Check, CheckCircle2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "./Badge";
import {
  formatDueDate,
  getQuadrant,
  getQuadrantLabel,
  getStatusLabel,
  isDueToday,
  isDueWithinNext7Days,
  isOverdue,
} from "../taskUtils";
import type { Task } from "../types";

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  showStatus?: boolean;
  showQuadrant?: boolean;
};

function dueTone(task: Task): "overdue" | "dueToday" | "dueSoon" | "dueLater" {
  if (isOverdue(task)) return "overdue";
  if (isDueToday(task)) return "dueToday";
  if (isDueWithinNext7Days(task)) return "dueSoon";
  return "dueLater";
}

export function TaskCard({
  task,
  onEdit,
  onToggleDone,
  onDelete,
  showStatus = true,
  showQuadrant = true,
}: TaskCardProps) {
  const quadrant = getQuadrant(task);
  const done = task.status === "done";
  const dueLabel = formatDueDate(task);

  return (
    <article className={`task-card${done ? " task-card-done" : ""}`}>
      <div className="task-card-top">
        <h3 className="task-card-title">
          {done && <CheckCircle2 size={14} className="task-card-done-icon" aria-hidden="true" />}
          <span>{task.title}</span>
        </h3>
        <div className="task-card-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={`Edit "${task.title}"`}
            onClick={() => onEdit(task)}
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
            onClick={() => onToggleDone(task)}
          >
            {done ? <RotateCcw size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            aria-label={`Delete "${task.title}"`}
            onClick={() => onDelete(task)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      {task.description && <p className="task-card-description">{task.description}</p>}
      <div className="task-card-badges">
        {showStatus && <Badge tone={task.status}>{getStatusLabel(task.status)}</Badge>}
        {showQuadrant && <Badge tone={quadrant}>{getQuadrantLabel(quadrant)}</Badge>}
        {dueLabel && (
          <Badge tone={done ? "dueLater" : dueTone(task)} title={task.dueDate ?? undefined}>
            <Calendar size={11} aria-hidden="true" />
            {dueLabel}
          </Badge>
        )}
        {task.tags.map((tag) => (
          <Badge key={tag} tone="tag">
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  );
}
