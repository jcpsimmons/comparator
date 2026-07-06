import { Filter, X } from "lucide-react";
import {
  COMPLETION_FILTER_LABELS,
  DEFAULT_FILTERS,
  DUE_FILTER_LABELS,
  QUADRANT_ORDER,
  STATUS_ORDER,
} from "../constants";
import { getQuadrantLabel, getStatusLabel } from "../taskUtils";
import type { AppState, CompletionFilter, DueFilter, QuadrantKey, TaskStatus } from "../types";

type FilterBarProps = {
  filters: AppState["filters"];
  allTags: string[];
  totalCount: number;
  visibleCount: number;
  hasSearchOrFilters: boolean;
  onFiltersChange: (filters: AppState["filters"]) => void;
  onClearFilters: () => void;
};

function selectedValues<T extends string>(event: React.ChangeEvent<HTMLSelectElement>): T[] {
  return Array.from(event.currentTarget.selectedOptions).map((option) => option.value as T);
}

export function FilterBar({ filters, allTags, totalCount, visibleCount, hasSearchOrFilters, onFiltersChange, onClearFilters }: FilterBarProps) {
  const hasFilters =
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== DEFAULT_FILTERS.due ||
    filters.completion !== DEFAULT_FILTERS.completion;

  return (
    <section className="filter-bar" aria-label="Task filters">
      <div className="filter-title">
        <Filter size={16} aria-hidden="true" />
        <span>{hasSearchOrFilters ? `${totalCount} tasks · ${visibleCount} visible` : `${totalCount} tasks`}</span>
      </div>

      <label className="filter-control multi">
        <span>Status</span>
        <select
          multiple
          value={filters.statuses}
          aria-label="Filter by status"
          onChange={(event) => onFiltersChange({ ...filters, statuses: selectedValues<TaskStatus>(event) })}
        >
          {STATUS_ORDER.map((status) => (
            <option value={status} key={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-control multi">
        <span>Quadrant</span>
        <select
          multiple
          value={filters.quadrants}
          aria-label="Filter by quadrant"
          onChange={(event) => onFiltersChange({ ...filters, quadrants: selectedValues<QuadrantKey>(event) })}
        >
          {QUADRANT_ORDER.map((quadrant) => (
            <option value={quadrant} key={quadrant}>
              {getQuadrantLabel(quadrant)}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-control">
        <span>Due</span>
        <select value={filters.due} aria-label="Filter by due date" onChange={(event) => onFiltersChange({ ...filters, due: event.target.value as DueFilter })}>
          {Object.entries(DUE_FILTER_LABELS).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-control multi">
        <span>Tags</span>
        <select
          multiple
          value={filters.tags}
          aria-label="Filter by tags"
          onChange={(event) => onFiltersChange({ ...filters, tags: selectedValues<string>(event) })}
          disabled={allTags.length === 0}
        >
          {allTags.map((tag) => (
            <option value={tag} key={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-control">
        <span>Completion</span>
        <select
          value={filters.completion}
          aria-label="Filter by completion"
          onChange={(event) => onFiltersChange({ ...filters, completion: event.target.value as CompletionFilter })}
        >
          {Object.entries(COMPLETION_FILTER_LABELS).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="clear-button" onClick={onClearFilters} disabled={!hasFilters}>
        <X size={15} aria-hidden="true" />
        Clear filters
      </button>
    </section>
  );
}
