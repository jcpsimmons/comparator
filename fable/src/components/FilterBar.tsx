import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListFilter, X } from "lucide-react";
import {
  DEFAULT_FILTERS,
  QUADRANT_LABELS,
  QUADRANT_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from "../constants";
import type { CompletionFilter, DueFilter, Filters } from "../types";

type FilterBarProps = {
  filters: Filters;
  allTags: string[];
  totalCount: number;
  visibleCount: number;
  searchActive: boolean;
  onChange: (filters: Filters) => void;
  onClear: () => void;
};

type DropdownProps = {
  label: string;
  selectedCount: number;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
};

function MultiSelectDropdown({ label, selectedCount, options, selected, onToggle }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className={`button button-small${selectedCount > 0 ? " button-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {label}
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="dropdown-panel" role="group" aria-label={`${label} filter options`}>
          {options.length === 0 && <p className="dropdown-empty">No options</p>}
          {options.map((option) => (
            <label key={option.value} className="dropdown-option">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function FilterBar({
  filters,
  allTags,
  totalCount,
  visibleCount,
  searchActive,
  onChange,
  onClear,
}: FilterBarProps) {
  const filtersActive =
    filters.statuses.length > 0 ||
    filters.quadrants.length > 0 ||
    filters.tags.length > 0 ||
    filters.due !== DEFAULT_FILTERS.due ||
    filters.completion !== DEFAULT_FILTERS.completion;

  return (
    <div className="filter-bar">
      <span className="filter-bar-icon" aria-hidden="true">
        <ListFilter size={14} />
      </span>
      <MultiSelectDropdown
        label="Status"
        selectedCount={filters.statuses.length}
        options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        selected={filters.statuses}
        onToggle={(value) =>
          onChange({
            ...filters,
            statuses: toggleValue(filters.statuses, value as Filters["statuses"][number]),
          })
        }
      />
      <MultiSelectDropdown
        label="Quadrant"
        selectedCount={filters.quadrants.length}
        options={QUADRANT_ORDER.map((q) => ({ value: q, label: QUADRANT_LABELS[q] }))}
        selected={filters.quadrants}
        onToggle={(value) =>
          onChange({
            ...filters,
            quadrants: toggleValue(filters.quadrants, value as Filters["quadrants"][number]),
          })
        }
      />
      <MultiSelectDropdown
        label="Tags"
        selectedCount={filters.tags.length}
        options={allTags.map((t) => ({ value: t, label: t }))}
        selected={filters.tags}
        onToggle={(value) => onChange({ ...filters, tags: toggleValue(filters.tags, value) })}
      />
      <label className="filter-select">
        <span className="filter-select-label">Due</span>
        <select
          value={filters.due}
          onChange={(e) => onChange({ ...filters, due: e.target.value as DueFilter })}
        >
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="next7">Next 7 days</option>
          <option value="none">No due date</option>
        </select>
      </label>
      <label className="filter-select">
        <span className="filter-select-label">Show</span>
        <select
          value={filters.completion}
          onChange={(e) =>
            onChange({ ...filters, completion: e.target.value as CompletionFilter })
          }
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
      </label>
      {filtersActive && (
        <button type="button" className="button button-small" onClick={onClear}>
          <X size={13} aria-hidden="true" />
          <span>Clear filters</span>
        </button>
      )}
      {(filtersActive || searchActive) && (
        <span className="filter-summary" role="status">
          {totalCount} {totalCount === 1 ? "task" : "tasks"} · {visibleCount} visible
        </span>
      )}
    </div>
  );
}
