import { ArrowUpDown, Calendar, Check, ChevronDown, ChevronUp, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { QUADRANT_META, STATUS_META } from "../constants";
import { dueClassName, formatDueDate, getQuadrant, getQuadrantLabel, getStatusLabel, sortTasksForList } from "../taskUtils";
import type { ListSortKey, SortDirection, Task } from "../types";
import { Badge } from "./Badge";
import { TaskCard } from "./TaskCard";

type ListViewProps = {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

type SortButtonProps = {
  label: string;
  sortKey: ListSortKey;
  currentKey: ListSortKey;
  direction: SortDirection;
  onClick: (key: ListSortKey) => void;
};

function isDone(task: Task): boolean {
  return task.status === "done" || task.completedAt !== null;
}

function SortButton({ label, sortKey, currentKey, direction, onClick }: SortButtonProps) {
  const isActive = sortKey === currentKey;

  return (
    <button type="button" className="table-sort-button" onClick={() => onClick(sortKey)} aria-label={`Sort by ${label}`}>
      {label}
      {isActive ? (
        direction === "asc" ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown size={13} aria-hidden="true" />
      )}
    </button>
  );
}

export function ListView({ tasks, onEditTask, onToggleComplete, onDeleteTask }: ListViewProps) {
  const [sortKey, setSortKey] = useState<ListSortKey>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedTasks = useMemo(() => sortTasksForList(tasks, sortKey, sortDirection), [tasks, sortKey, sortDirection]);

  const toggleSort = (key: ListSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "updatedAt" ? "desc" : "asc");
    }
  };

  return (
    <div className="list-view">
      <div className="list-toolbar">
        <button type="button" className={sortKey === "default" ? "secondary-button is-selected" : "secondary-button"} onClick={() => setSortKey("default")}>
          Default sort
        </button>
      </div>

      <div className="list-table-wrap">
        <table className="task-table">
          <thead>
            <tr>
              <th scope="col">Done</th>
              <th scope="col">
                <SortButton label="Title" sortKey="title" currentKey={sortKey} direction={sortDirection} onClick={toggleSort} />
              </th>
              <th scope="col">
                <SortButton label="Status" sortKey="status" currentKey={sortKey} direction={sortDirection} onClick={toggleSort} />
              </th>
              <th scope="col">
                <SortButton label="Quadrant" sortKey="quadrant" currentKey={sortKey} direction={sortDirection} onClick={toggleSort} />
              </th>
              <th scope="col">
                <SortButton label="Due date" sortKey="dueDate" currentKey={sortKey} direction={sortDirection} onClick={toggleSort} />
              </th>
              <th scope="col">Tags</th>
              <th scope="col">
                <SortButton label="Updated" sortKey="updatedAt" currentKey={sortKey} direction={sortDirection} onClick={toggleSort} />
              </th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const quadrant = getQuadrant(task);
              const dueLabel = formatDueDate(task) || "No date";
              const updated = new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(task.updatedAt));

              return (
                <tr key={task.id} className={isDone(task) ? "is-complete" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isDone(task)}
                      aria-label={isDone(task) ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                      onChange={() => onToggleComplete(task)}
                    />
                  </td>
                  <td>
                    <button type="button" className="table-title-button" onClick={() => onEditTask(task)}>
                      {task.title}
                    </button>
                    {task.description ? <p>{task.description}</p> : null}
                  </td>
                  <td>
                    <Badge className={STATUS_META[task.status].className}>{getStatusLabel(task.status)}</Badge>
                  </td>
                  <td>
                    <Badge className={QUADRANT_META[quadrant].className}>{getQuadrantLabel(quadrant)}</Badge>
                  </td>
                  <td>
                    <Badge className={task.dueDate ? dueClassName(task) : "muted-badge"}>
                      <Calendar size={13} aria-hidden="true" />
                      {dueLabel}
                    </Badge>
                  </td>
                  <td>
                    <div className="tag-row in-table">
                      {task.tags.map((tag) => (
                        <span className="tag-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{updated}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => onEditTask(task)}>
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-button" aria-label={isDone(task) ? `Reopen ${task.title}` : `Mark ${task.title} done`} onClick={() => onToggleComplete(task)}>
                        {isDone(task) ? <RotateCcw size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                      </button>
                      <button type="button" className="icon-button danger" aria-label={`Delete ${task.title}`} onClick={() => onDeleteTask(task)}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="list-cards">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            compact
            onEdit={onEditTask}
            onToggleComplete={onToggleComplete}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
}
