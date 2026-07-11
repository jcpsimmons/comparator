import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { Badge } from "./Badge";
import {
  formatDueDate,
  getDueBadgeVariant,
  getQuadrant,
  getQuadrantLabel,
  getStatusLabel,
  sortTasksForList,
} from "../taskUtils";
import type { ListSortDir, ListSortKey, Task } from "../types";

type ListViewProps = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const SORT_OPTIONS: { key: ListSortKey; label: string }[] = [
  { key: "default", label: "Default priority" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "quadrant", label: "Quadrant" },
  { key: "dueDate", label: "Due date" },
  { key: "updatedAt", label: "Updated" },
];

export function ListView({
  tasks,
  onEdit,
  onToggleComplete,
  onDelete,
}: ListViewProps) {
  const [sortKey, setSortKey] = useState<ListSortKey>("default");
  const [sortDir, setSortDir] = useState<ListSortDir>("asc");

  const sorted = useMemo(
    () => sortTasksForList(tasks, sortKey, sortDir),
    [tasks, sortKey, sortDir],
  );

  return (
    <div className="list-view" data-view="list">
      <div className="list-toolbar">
        <label className="list-sort">
          <span>Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as ListSortKey)}
            aria-label="Sort list by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {sortKey !== "default" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label={`Sort direction ${sortDir}`}
          >
            {sortDir === "asc" ? "Ascending" : "Descending"}
          </button>
        ) : null}
      </div>

      <div className="list-table-wrap list-desktop">
        <table className="list-table">
          <thead>
            <tr>
              <th scope="col">Done</th>
              <th scope="col">Title</th>
              <th scope="col">Status</th>
              <th scope="col">Quadrant</th>
              <th scope="col">Due date</th>
              <th scope="col">Tags</th>
              <th scope="col">Updated</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const quadrant = getQuadrant(task);
              const dueLabel = formatDueDate(task);
              const dueVariant = getDueBadgeVariant(task);
              const isDone = task.status === "done" || !!task.completedAt;
              return (
                <tr key={task.id} data-task-id={task.id} className={isDone ? "is-done" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isDone}
                      aria-label={isDone ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                      onChange={() => onToggleComplete(task)}
                    />
                  </td>
                  <td>
                    <div className="list-title-cell">
                      <span className="list-title">{task.title}</span>
                      {task.description ? (
                        <span className="list-desc">{task.description}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <Badge variant="status">{getStatusLabel(task.status)}</Badge>
                  </td>
                  <td>
                    <Badge variant={quadrant}>{getQuadrantLabel(quadrant)}</Badge>
                  </td>
                  <td>
                    {dueLabel ? (
                      <Badge variant={dueVariant === "neutral" || !dueVariant ? "default" : dueVariant}>
                        {dueLabel}
                      </Badge>
                    ) : (
                      <span className="muted">No date</span>
                    )}
                  </td>
                  <td>
                    <div className="list-tags">
                      {task.tags.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        task.tags.map((tag) => (
                          <Badge key={tag} variant="tag">
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="list-updated">
                    {format(parseISO(task.updatedAt), "MMM d, yyyy")}
                  </td>
                  <td>
                    <div className="list-actions">
                      <button
                        type="button"
                        className="btn btn-icon"
                        aria-label={`Edit ${task.title}`}
                        onClick={() => onEdit(task)}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-icon"
                        aria-label={isDone ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                        onClick={() => onToggleComplete(task)}
                      >
                        {isDone ? (
                          <RotateCcw size={14} aria-hidden />
                        ) : (
                          <Check size={14} aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-icon btn-danger"
                        aria-label={`Delete ${task.title}`}
                        onClick={() => onDelete(task)}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="list-mobile">
        {sorted.map((task) => (
          <div key={task.id} className="list-mobile-card" data-task-id={task.id}>
            {/* Reuse TaskCard-like layout without dnd */}
            <article className={`task-card${task.status === "done" ? " is-done" : ""}`}>
              <div className="task-card-header">
                <h3 className="task-card-title">{task.title}</h3>
              </div>
              {task.description ? (
                <p className="task-card-desc">{task.description}</p>
              ) : null}
              <div className="task-card-badges">
                <Badge variant="status">{getStatusLabel(task.status)}</Badge>
                <Badge variant={getQuadrant(task)}>
                  {getQuadrantLabel(getQuadrant(task))}
                </Badge>
                {formatDueDate(task) ? (
                  <Badge
                    variant={
                      getDueBadgeVariant(task) === "neutral" || !getDueBadgeVariant(task)
                        ? "default"
                        : (getDueBadgeVariant(task) as "overdue" | "today" | "soon")
                    }
                  >
                    {formatDueDate(task)}
                  </Badge>
                ) : (
                  <span className="muted">No date</span>
                )}
              </div>
              <div className="task-card-actions">
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={`Edit ${task.title}`}
                  onClick={() => onEdit(task)}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={
                    task.status === "done"
                      ? `Reopen ${task.title}`
                      : `Mark ${task.title} done`
                  }
                  onClick={() => onToggleComplete(task)}
                >
                  {task.status === "done" ? (
                    <RotateCcw size={14} aria-hidden />
                  ) : (
                    <Check size={14} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-danger"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => onDelete(task)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
