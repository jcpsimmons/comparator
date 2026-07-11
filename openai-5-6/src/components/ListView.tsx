import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import type { QuadrantKey, Task, TaskStatus } from "../types";
import { Badge } from "./Badge";
import { TaskCard } from "./TaskCard";

export type ListSortKey = "default" | "dueDate" | "status" | "quadrant" | "title" | "updatedAt";

export type ListSortDirection = "ascending" | "descending";

export type ListViewProps = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type SortState = {
  key: ListSortKey;
  direction: ListSortDirection;
};

type SortableHeadingProps = {
  label: string;
  sortKey: Exclude<ListSortKey, "default">;
  sort: SortState;
  onSort: (key: Exclude<ListSortKey, "default">) => void;
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

const DEFAULT_DIRECTIONS: Record<Exclude<ListSortKey, "default">, ListSortDirection> = {
  dueDate: "ascending",
  status: "ascending",
  quadrant: "ascending",
  title: "ascending",
  updatedAt: "descending",
};

function compareTasks(
  left: Task,
  right: Task,
  key: Exclude<ListSortKey, "default">,
  direction: ListSortDirection,
) {
  const multiplier = direction === "ascending" ? 1 : -1;
  let result = 0;

  switch (key) {
    case "dueDate": {
      if (left.dueDate === null && right.dueDate === null) result = 0;
      else if (left.dueDate === null) return 1;
      else if (right.dueDate === null) return -1;
      else result = left.dueDate.localeCompare(right.dueDate);
      break;
    }
    case "status":
      result = STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status);
      break;
    case "quadrant":
      result =
        QUADRANT_ORDER.indexOf(getQuadrant(left)) - QUADRANT_ORDER.indexOf(getQuadrant(right));
      break;
    case "title":
      result = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
      break;
    case "updatedAt":
      result = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      break;
  }

  return result * multiplier || left.title.localeCompare(right.title);
}

function SortIcon({ direction }: { direction?: ListSortDirection }) {
  if (direction === "ascending") return <ArrowUp aria-hidden="true" />;
  if (direction === "descending") return <ArrowDown aria-hidden="true" />;
  return <ArrowUpDown aria-hidden="true" />;
}

function SortableHeading({ label, sortKey, sort, onSort }: SortableHeadingProps) {
  const isActive = sort.key === sortKey;

  return (
    <th scope="col" aria-sort={isActive ? sort.direction : "none"}>
      <button className="list-table__sort-button" type="button" onClick={() => onSort(sortKey)}>
        {label}
        <SortIcon direction={isActive ? sort.direction : undefined} />
      </button>
    </th>
  );
}

function getDueTone(task: Task): "neutral" | "red" | "blue" | "amber" {
  if (task.status === "done") return "neutral";
  if (isOverdue(task)) return "red";
  if (isDueToday(task)) return "amber";
  if (isDueWithinNext7Days(task)) return "blue";
  return "neutral";
}

export function ListView({ tasks, onEdit, onToggleComplete, onDelete }: ListViewProps) {
  const [sort, setSort] = useState<SortState>({
    key: "default",
    direction: "ascending",
  });

  const sortedTasks = useMemo(() => {
    if (sort.key === "default") return sortTasksForList(tasks);
    return [...tasks].sort((left, right) =>
      compareTasks(left, right, sort.key as Exclude<ListSortKey, "default">, sort.direction),
    );
  }, [sort, tasks]);

  const handleSort = (key: Exclude<ListSortKey, "default">) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "ascending"
            ? "descending"
            : "ascending"
          : DEFAULT_DIRECTIONS[key],
    }));
  };

  const handleSortKeyChange = (key: ListSortKey) => {
    setSort((current) => ({
      key,
      direction:
        key === "default"
          ? "ascending"
          : current.key === key
            ? current.direction
            : DEFAULT_DIRECTIONS[key],
    }));
  };

  const toggleDirection = () => {
    setSort((current) => ({
      ...current,
      direction: current.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  return (
    <section className="list-view" aria-label="Task list">
      <div className="list-view__sort-controls">
        <label htmlFor="mobile-list-sort">Sort tasks</label>
        <select
          id="mobile-list-sort"
          value={sort.key}
          onChange={(event) => handleSortKeyChange(event.target.value as ListSortKey)}
        >
          <option value="default">Smart default</option>
          <option value="dueDate">Due date</option>
          <option value="status">Status</option>
          <option value="quadrant">Quadrant</option>
          <option value="title">Title</option>
          <option value="updatedAt">Updated</option>
        </select>
        <button
          className="icon-button"
          type="button"
          disabled={sort.key === "default"}
          onClick={toggleDirection}
          aria-label={`Sort ${sort.direction === "ascending" ? "descending" : "ascending"}`}
          title={`Sort ${sort.direction === "ascending" ? "descending" : "ascending"}`}
        >
          <SortIcon direction={sort.direction} />
        </button>
      </div>

      <div className="list-view__table-wrap">
        <table className="list-table">
          <caption className="visually-hidden">Visible tasks</caption>
          <thead>
            <tr>
              <th scope="col" className="list-table__done-column">
                Done
              </th>
              <SortableHeading label="Title" sortKey="title" sort={sort} onSort={handleSort} />
              <SortableHeading label="Status" sortKey="status" sort={sort} onSort={handleSort} />
              <SortableHeading
                label="Quadrant"
                sortKey="quadrant"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeading label="Due date" sortKey="dueDate" sort={sort} onSort={handleSort} />
              <th scope="col">Tags</th>
              <SortableHeading
                label="Updated"
                sortKey="updatedAt"
                sort={sort}
                onSort={handleSort}
              />
              <th scope="col" className="list-table__actions-column">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const quadrant = getQuadrant(task);
              const isComplete = task.status === "done";

              return (
                <tr key={task.id} className={isComplete ? "list-table__row--complete" : undefined}>
                  <td className="list-table__done-column">
                    <input
                      type="checkbox"
                      checked={isComplete}
                      onChange={() => onToggleComplete(task)}
                      aria-label={`${isComplete ? "Reopen" : "Complete"} ${task.title}`}
                    />
                  </td>
                  <td className="list-table__title-cell">
                    <button type="button" onClick={() => onEdit(task)}>
                      {task.title}
                    </button>
                    {task.description ? <p>{task.description}</p> : null}
                  </td>
                  <td>
                    <Badge tone={STATUS_TONES[task.status]}>{getStatusLabel(task.status)}</Badge>
                  </td>
                  <td>
                    <Badge tone={QUADRANT_TONES[quadrant]}>{getQuadrantLabel(quadrant)}</Badge>
                  </td>
                  <td>
                    {task.dueDate ? (
                      <Badge tone={getDueTone(task)} className="list-table__due-badge">
                        <CalendarDays aria-hidden="true" />
                        {formatDueDate(task)}
                      </Badge>
                    ) : (
                      <span className="list-table__no-date">No date</span>
                    )}
                  </td>
                  <td>
                    {task.tags.length > 0 ? (
                      <ul className="list-table__tags" aria-label={`Tags for ${task.title}`}>
                        {task.tags.map((tag) => (
                          <li key={tag.toLocaleLowerCase()}>
                            <Badge tone="neutral">{tag}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="visually-hidden">No tags</span>
                    )}
                  </td>
                  <td>
                    <time
                      dateTime={task.updatedAt}
                      title={format(parseISO(task.updatedAt), "PPpp")}
                    >
                      {format(parseISO(task.updatedAt), "MMM d, yyyy")}
                    </time>
                  </td>
                  <td>
                    <div className="list-table__actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => onEdit(task)}
                        aria-label={`Edit ${task.title}`}
                        title="Edit task"
                      >
                        <Pencil aria-hidden="true" />
                      </button>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="list-view__cards">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            compact
            completionControl="checkbox"
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export default ListView;
