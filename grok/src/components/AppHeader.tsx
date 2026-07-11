import { Download, Plus, Search, Upload, X } from "lucide-react";
import type { AppView } from "../types";

type AppHeaderProps = {
  activeView: AppView;
  searchQuery: string;
  onViewChange: (view: AppView) => void;
  onSearchChange: (query: string) => void;
  onAddTask: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  totalTasks: number;
  visibleTasks: number;
  filtersActive: boolean;
};

const VIEWS: { id: AppView; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "matrix", label: "Matrix" },
  { id: "list", label: "List" },
];

export function AppHeader({
  activeView,
  searchQuery,
  onViewChange,
  onSearchChange,
  onAddTask,
  onExport,
  onImportFile,
  totalTasks,
  visibleTasks,
  filtersActive,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="app-brand">
          <h1 className="app-name">Priority Board</h1>
          {(filtersActive || searchQuery.trim()) && totalTasks > 0 ? (
            <p className="task-summary" aria-live="polite">
              {totalTasks} tasks · {visibleTasks} visible
            </p>
          ) : null}
        </div>

        <nav className="view-switcher" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`view-btn${activeView === v.id ? " is-active" : ""}`}
              aria-pressed={activeView === v.id}
              onClick={() => onViewChange(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <div className="app-header-actions">
          <button type="button" className="btn btn-primary" onClick={onAddTask}>
            <Plus size={16} aria-hidden />
            <span>Add Task</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExport}
            aria-label="Export board as JSON"
          >
            <Download size={16} aria-hidden />
            <span className="btn-label-wide">Export</span>
          </button>
          <label className="btn btn-secondary import-label">
            <Upload size={16} aria-hidden />
            <span className="btn-label-wide">Import</span>
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import board from JSON file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="search-row">
        <label className="search-field" htmlFor="board-search">
          <Search size={16} aria-hidden className="search-icon" />
          <span className="sr-only">Search tasks</span>
          <input
            id="board-search"
            type="search"
            placeholder="Search title, description, or tags…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="btn btn-icon search-clear"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X size={14} aria-hidden />
            </button>
          ) : null}
        </label>
      </div>
    </header>
  );
}
