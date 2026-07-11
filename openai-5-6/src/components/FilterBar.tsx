import { Filter, RotateCcw } from "lucide-react";
import type { QuadrantKey, TaskFilters, TaskStatus } from "../types";

export interface FilterBarProps {
  filters: TaskFilters;
  availableTags: string[];
  onFiltersChange: (filters: TaskFilters) => void;
  onClear: () => void;
}

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

const STATUS_OPTIONS: readonly FilterOption<TaskStatus>[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "inProgress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const QUADRANT_OPTIONS: readonly FilterOption<QuadrantKey>[] = [
  { value: "doNow", label: "Do Now" },
  { value: "schedule", label: "Schedule" },
  { value: "delegate", label: "Delegate" },
  { value: "eliminate", label: "Eliminate" },
];

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function includesTag(tags: readonly string[], tag: string): boolean {
  const key = tag.toLocaleLowerCase();
  return tags.some((candidate) => candidate.toLocaleLowerCase() === key);
}

function toggleTag(tags: readonly string[], tag: string): string[] {
  const key = tag.toLocaleLowerCase();
  return includesTag(tags, tag)
    ? tags.filter((candidate) => candidate.toLocaleLowerCase() !== key)
    : [...tags, tag];
}

function selectionSummary(count: number): string {
  return count === 0 ? "All" : `${count} selected`;
}

export function FilterBar({ filters, availableTags, onFiltersChange, onClear }: FilterBarProps) {
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== "all" ||
    filters.completion !== "all";

  const tags = [...availableTags].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return (
    <section className="filter-bar" aria-label="Task filters">
      <div className="filter-bar__heading" aria-hidden="true">
        <Filter size={16} />
        <span>Filters</span>
      </div>

      <div className="filter-bar__controls">
        <details className="filter-menu">
          <summary className="filter-menu__summary">
            <span>Status</span>
            <span className="filter-menu__count">{selectionSummary(filters.statuses.length)}</span>
          </summary>
          <fieldset className="filter-menu__options">
            <legend className="visually-hidden">Filter by status</legend>
            {STATUS_OPTIONS.map((option) => (
              <label className="filter-option" key={option.value}>
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(option.value)}
                  onChange={() =>
                    onFiltersChange({
                      ...filters,
                      statuses: toggleValue(filters.statuses, option.value),
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </details>

        <details className="filter-menu">
          <summary className="filter-menu__summary">
            <span>Quadrant</span>
            <span className="filter-menu__count">{selectionSummary(filters.quadrants.length)}</span>
          </summary>
          <fieldset className="filter-menu__options">
            <legend className="visually-hidden">Filter by quadrant</legend>
            {QUADRANT_OPTIONS.map((option) => (
              <label className="filter-option" key={option.value}>
                <input
                  type="checkbox"
                  checked={filters.quadrants.includes(option.value)}
                  onChange={() =>
                    onFiltersChange({
                      ...filters,
                      quadrants: toggleValue(filters.quadrants, option.value),
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </details>

        <details className="filter-menu">
          <summary className="filter-menu__summary">
            <span>Tags</span>
            <span className="filter-menu__count">{selectionSummary(filters.tags.length)}</span>
          </summary>
          <fieldset className="filter-menu__options filter-menu__options--scrollable">
            <legend className="visually-hidden">Filter by tag</legend>
            {tags.length > 0 ? (
              tags.map((tag) => (
                <label className="filter-option" key={tag}>
                  <input
                    type="checkbox"
                    checked={includesTag(filters.tags, tag)}
                    onChange={() =>
                      onFiltersChange({
                        ...filters,
                        tags: toggleTag(filters.tags, tag),
                      })
                    }
                  />
                  <span>{tag}</span>
                </label>
              ))
            ) : (
              <span className="filter-menu__empty">No tags yet</span>
            )}
          </fieldset>
        </details>

        <label className="filter-select">
          <span>Due</span>
          <select
            value={filters.due}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                due: event.currentTarget.value as TaskFilters["due"],
              })
            }
          >
            <option value="all">All dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="next7">Next 7 days</option>
            <option value="none">No due date</option>
          </select>
        </label>

        <label className="filter-select">
          <span>Completion</span>
          <select
            value={filters.completion}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                completion: event.currentTarget.value as TaskFilters["completion"],
              })
            }
          >
            <option value="all">All tasks</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
        </label>
      </div>

      <button
        className="filter-bar__clear"
        type="button"
        onClick={onClear}
        disabled={!hasActiveFilters}
      >
        <RotateCcw size={15} aria-hidden="true" />
        <span>Clear filters</span>
      </button>
    </section>
  );
}

export default FilterBar;
