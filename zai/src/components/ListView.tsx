import { useState } from "react";
import { Check, Edit2, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "./Badge";
import { TaskCard } from "./TaskCard";
import { EmptyState } from "./EmptyState";
import {
  ACCENT_COLORS,
  QUADRANT_LABELS,
  STATUS_LABELS,
} from "../constants";
import {
  formatDueDate,
  getQuadrant,
  isDueToday,
  isOverdue,
  sortTasksForList,
  type ListSortKey,
} from "../taskUtils";
import type { Task } from "../types";
import { format } from "date-fns";

interface ListViewProps {
  tasks: Task[];
  isMobile: boolean;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAdd: () => void;
}

const SORT_OPTIONS: { value: ListSortKey; label: string }[] = [
  { value: "due", label: "Smart (default)" },
  { value: "due", label: "Due date" },
  { value: "status", label: "Status" },
  { value: "quadrant", label: "Quadrant" },
  { value: "title", label: "Title" },
  { value: "updated", label: "Updated" },
];

export function ListView({
  tasks,
  isMobile,
  onEdit,
  onToggleComplete,
  onDelete,
  onAdd,
}: ListViewProps) {
  const [sortKey, setSortKey] = useState<ListSortKey>("due");
  const [ascending, setAscending] = useState(true);

  const sorted = sortTasksForList(tasks, sortKey, ascending);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks yet"
        message="Add your first task to get started."
        onAction={onAdd}
        actionLabel="Add Task"
      />
    );
  }

  return (
    <div className="list-view">
      <div className="list-controls">
        <label className="inline-field">
          <span className="field-label">Sort by</span>
          <select
            className="input"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as ListSortKey)}
          >
            {SORT_OPTIONS.filter(
              (opt, idx) =>
                SORT_OPTIONS.findIndex((o) => o.value === opt.value) === idx
            ).map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={ascending}
            onChange={(e) => setAscending(e.target.checked)}
          />
          <span>Ascending</span>
        </label>
      </div>

      {isMobile ? (
        <div className="list-cards">
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              draggable={false}
            />
          ))}
        </div>
      ) : (
        <div className="list-table-wrap">
          <table className="list-table">
            <thead>
              <tr>
                <th scope="col" className="col-done">Done</th>
                <th scope="col" className="col-title">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Quadrant</th>
                <th scope="col">Due</th>
                <th scope="col">Tags</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((task) => {
                const q = getQuadrant(task);
                const accent = ACCENT_COLORS[q];
                const dueLabel = formatDueDate(task);
                const overdue = isOverdue(task);
                const dueToday = isDueToday(task);
                return (
                  <tr key={task.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={() => onToggleComplete(task)}
                        aria-label={
                          task.status === "done"
                            ? `Reopen ${task.title}`
                            : `Mark ${task.title} done`
                        }
                      />
                    </td>
                    <td className="col-title">
                      <span
                        className={
                          task.status === "done"
                            ? "list-title is-done"
                            : "list-title"
                        }
                      >
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="list-desc-preview">
                          {task.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge
                        variant={
                          task.status === "done"
                            ? "green"
                            : task.status === "inProgress"
                              ? "blue"
                              : task.status === "todo"
                                ? "amber"
                                : "gray"
                        }
                      >
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={accent}>
                        {QUADRANT_LABELS[q]}
                      </Badge>
                    </td>
                    <td>
                      {dueLabel ? (
                        <Badge
                          variant={
                            overdue
                              ? "red"
                              : dueToday
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {dueLabel}
                        </Badge>
                      ) : (
                        <span className="muted">No date</span>
                      )}
                    </td>
                    <td>
                      {task.tags.length > 0 ? (
                        <div className="tag-row">
                          {task.tags.map((tag) => (
                            <span key={tag} className="tag-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">
                      {format(new Date(task.updatedAt), "MMM d, yyyy")}
                    </td>
                    <td>
                      <div className="row-actions">
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
                          aria-label={
                            task.status === "done"
                              ? "Reopen task"
                              : "Mark task done"
                          }
                          onClick={() => onToggleComplete(task)}
                        >
                          {task.status === "done" ? (
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
