import { Filter, X } from "lucide-react";
import {
  COMPLETION_FILTER_LABELS,
  DUE_FILTER_LABELS,
  QUADRANT_LABELS,
  QUADRANT_LIST,
  STATUS_LABELS,
  STATUS_ORDER,
} from "../constants";
import type {
  CompletionFilter,
  DueFilter,
  Filters,
  QuadrantKey,
  TaskStatus,
} from "../types";

interface FilterBarProps {
  filters: Filters;
  allTags: string[];
  onChange: (next: Filters) => void;
  onClear: () => void;
}

export function FilterBar({
  filters,
  allTags,
  onChange,
  onClear,
}: FilterBarProps) {
  const toggle = <K extends string>(
    list: K[],
    value: K
  ): K[] =>
    list.includes(value)
      ? list.filter((x) => x !== value)
      : [...list, value];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">
          <Filter size={12} aria-hidden="true" /> Status
        </span>
        <div className="chip-row" role="group" aria-label="Status filter">
          {STATUS_ORDER.map((s) => (
            <Chip
              key={s}
              label={STATUS_LABELS[s]}
              active={filters.statuses.includes(s)}
              onClick={() =>
                onChange({
                  ...filters,
                  statuses: toggle(filters.statuses, s) as TaskStatus[],
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Quadrant</span>
        <div className="chip-row" role="group" aria-label="Quadrant filter">
          {QUADRANT_LIST.map((q) => (
            <Chip
              key={q}
              label={QUADRANT_LABELS[q]}
              active={filters.quadrants.includes(q)}
              onClick={() =>
                onChange({
                  ...filters,
                  quadrants: toggle(filters.quadrants, q) as QuadrantKey[],
                })
              }
            />
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Tags</span>
          <div className="chip-row" role="group" aria-label="Tag filter">
            {allTags.map((tag) => {
              const active = filters.tags.some(
                (t) => t.toLowerCase() === tag.toLowerCase()
              );
              return (
                <Chip
                  key={tag}
                  label={tag}
                  active={active}
                  onClick={() =>
                    onChange({
                      ...filters,
                      tags: active
                        ? filters.tags.filter(
                            (t) => t.toLowerCase() !== tag.toLowerCase()
                          )
                        : [...filters.tags, tag],
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="filter-group">
        <label className="inline-field">
          <span className="filter-label">Due</span>
          <select
            className="input"
            value={filters.due}
            onChange={(e) =>
              onChange({
                ...filters,
                due: e.target.value as DueFilter,
              })
            }
          >
            {Object.entries(DUE_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-group">
        <label className="inline-field">
          <span className="filter-label">Completion</span>
          <select
            className="input"
            value={filters.completion}
            onChange={(e) =>
              onChange({
                ...filters,
                completion: e.target.value as CompletionFilter,
              })
            }
          >
            {Object.entries(COMPLETION_FILTER_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <div className="filter-group filter-clear">
        <button type="button" className="btn" onClick={onClear}>
          <X size={14} aria-hidden="true" /> Clear filters
        </button>
      </div>
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
