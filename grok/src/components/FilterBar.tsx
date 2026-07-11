import { Filter, X } from "lucide-react";
import {
  QUADRANT_KEYS,
  QUADRANT_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
} from "../constants";
import type {
  CompletionFilter,
  DueFilter,
  Filters,
  QuadrantKey,
  TaskStatus,
} from "../types";

type FilterBarProps = {
  filters: Filters;
  availableTags: string[];
  onChange: (filters: Filters) => void;
  onClear: () => void;
};

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterBar({
  filters,
  availableTags,
  onChange,
  onClear,
}: FilterBarProps) {
  const hasActive =
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== "all" ||
    filters.completion !== "all";

  return (
    <section className="filter-bar" aria-label="Filters">
      <div className="filter-bar-label">
        <Filter size={14} aria-hidden />
        <span>Filters</span>
      </div>

      <div className="filter-group">
        <span className="filter-group-label" id="filter-status-label">
          Status
        </span>
        <div className="chip-row" role="group" aria-labelledby="filter-status-label">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${filters.statuses.includes(s) ? " is-active" : ""}`}
              aria-pressed={filters.statuses.includes(s)}
              onClick={() =>
                onChange({
                  ...filters,
                  statuses: toggleInList<TaskStatus>(filters.statuses, s),
                })
              }
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group-label" id="filter-quadrant-label">
          Quadrant
        </span>
        <div className="chip-row" role="group" aria-labelledby="filter-quadrant-label">
          {QUADRANT_KEYS.map((q) => (
            <button
              key={q}
              type="button"
              className={`chip chip-${q}${filters.quadrants.includes(q) ? " is-active" : ""}`}
              aria-pressed={filters.quadrants.includes(q)}
              onClick={() =>
                onChange({
                  ...filters,
                  quadrants: toggleInList<QuadrantKey>(filters.quadrants, q),
                })
              }
            >
              {QUADRANT_LABELS[q]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-group-label" htmlFor="filter-due">
          Due
        </label>
        <select
          id="filter-due"
          value={filters.due}
          onChange={(e) =>
            onChange({ ...filters, due: e.target.value as DueFilter })
          }
        >
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="next7">Next 7 days</option>
          <option value="none">No due date</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-group-label" htmlFor="filter-completion">
          Completion
        </label>
        <select
          id="filter-completion"
          value={filters.completion}
          onChange={(e) =>
            onChange({
              ...filters,
              completion: e.target.value as CompletionFilter,
            })
          }
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
      </div>

      {availableTags.length > 0 ? (
        <div className="filter-group">
          <span className="filter-group-label" id="filter-tags-label">
            Tags
          </span>
          <div className="chip-row" role="group" aria-labelledby="filter-tags-label">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip${filters.tags.includes(tag) ? " is-active" : ""}`}
                aria-pressed={filters.tags.includes(tag)}
                onClick={() =>
                  onChange({
                    ...filters,
                    tags: toggleInList(filters.tags, tag),
                  })
                }
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasActive ? (
        <button type="button" className="btn btn-secondary btn-clear-filters" onClick={onClear}>
          <X size={14} aria-hidden />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}
