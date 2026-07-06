import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { QUADRANT_ORDER, STATUS_ORDER } from "../constants";
import {
  formatDueDate,
  getQuadrant,
  getQuadrantLabel,
  getStatusLabel,
  isDueToday,
  isDueWithinNext7Days,
  isOverdue,
  sortTasksForList,
} from "../taskUtils";
import { Badge } from "./Badge";
import { TaskCard } from "./TaskCard";
import type { Task } from "../types";

type ListViewProps = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type SortKey = "default" | "title" | "status" | "quadrant" | "dueDate" | "updated";
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "quadrant", label: "Quadrant" },
  { key: "dueDate", label: "Due" },
  { key: "updated", label: "Updated" },
];

function compareBy(key: SortKey, a: Task, b: Task): number {
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "quadrant":
      return QUADRANT_ORDER.indexOf(getQuadrant(a)) - QUADRANT_ORDER.indexOf(getQuadrant(b));
    case "dueDate": {
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1; // no due date sorts last
      if (b.dueDate === null) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    case "updated":
      return a.updatedAt.localeCompare(b.updatedAt);
    case "default":
      return 0;
  }
}

function dueTone(task: Task): "overdue" | "dueToday" | "dueSoon" | "dueLater" {
  if (isOverdue(task)) return "overdue";
  if (isDueToday(task)) return "dueToday";
  if (isDueWithinNext7Days(task)) return "dueSoon";
  return "dueLater";
}

export function ListView({ tasks, onEdit, onToggleDone, onDelete }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (sortKey === "default") return sortTasksForList(tasks);
    const list = [...tasks].sort((a, b) => compareBy(sortKey, a, b));
    return sortDir === "desc" ? list.reverse() : list;
  }, [tasks, sortKey, sortDir]);

  function handleSortClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "updated" ? "desc" : "asc");
    }
  }

  return (
    <div className="list-view">
      <div className="list-toolbar">
        <label className="filter-select">
          <span className="filter-select-label">Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => {
              const key = e.target.value as SortKey;
              setSortKey(key);
              setSortDir(key === "updated" ? "desc" : "asc");
            }}
          >
            <option value="default">Priority (default)</option>
            <option value="dueDate">Due date</option>
            <option value="status">Status</option>
            <option value="quadrant">Quadrant</option>
            <option value="title">Title</option>
            <option value="updated">Updated</option>
          </select>
        </label>
      </div>

      <table className="list-table">
        <thead>
          <tr>
            <th scope="col" className="list-col-check">
              <span className="visually-hidden">Done</span>
            </th>
            {SORTABLE_COLUMNS.map(({ key, label }) => (
              <th key={key} scope="col" aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                <button type="button" className="list-sort-button" onClick={() => handleSortClick(key)}>
                  {label}
                  {sortKey === key &&
                    (sortDir === "asc" ? (
                      <ArrowUp size={12} aria-hidden="true" />
                    ) : (
                      <ArrowDown size={12} aria-hidden="true" />
                    ))}
                </button>
              </th>
            ))}
            <th scope="col">Tags</th>
            <th scope="col" className="list-col-actions">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
            const done = task.status === "done";
            const dueLabel = formatDueDate(task);
            return (
              <tr key={task.id} className={done ? "list-row-done" : undefined}>
                <td className="list-col-check">
                  <input
                    type="checkbox"
                    checked={done}
                    aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
                    onChange={() => onToggleDone(task)}
                  />
                </td>
                <td className="list-col-title">
                  <span className="list-title-text">{task.title}</span>
                  {task.description && (
                    <span className="list-description">{task.description}</span>
                  )}
                </td>
                <td>
                  <Badge tone={task.status}>{getStatusLabel(task.status)}</Badge>
                </td>
                <td>
                  <Badge tone={getQuadrant(task)}>{getQuadrantLabel(getQuadrant(task))}</Badge>
                </td>
                <td>
                  {dueLabel ? (
                    <Badge tone={done ? "dueLater" : dueTone(task)} title={task.dueDate ?? undefined}>
                      {dueLabel}
                    </Badge>
                  ) : (
                    <span className="list-muted">No date</span>
                  )}
                </td>
                <td className="list-col-updated">{format(parseISO(task.updatedAt), "MMM d")}</td>
                <td className="list-col-tags">
                  {task.tags.map((tag) => (
                    <Badge key={tag} tone="tag">
                      {tag}
                    </Badge>
                  ))}
                </td>
                <td className="list-col-actions">
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
                    className="icon-button icon-button-danger"
                    aria-label={`Delete "${task.title}"`}
                    onClick={() => onDelete(task)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="list-cards">
        {sorted.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onToggleDone={onToggleDone}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
