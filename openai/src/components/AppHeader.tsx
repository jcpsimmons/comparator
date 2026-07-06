import { Download, Plus, Search, Upload, X } from "lucide-react";
import type { AppView } from "../types";

type AppHeaderProps = {
  activeView: AppView;
  searchQuery: string;
  onViewChange: (view: AppView) => void;
  onSearchChange: (query: string) => void;
  onAddTask: () => void;
  onImport: () => void;
  onExport: () => void;
};

const views: Array<{ key: AppView; label: string }> = [
  { key: "kanban", label: "Kanban" },
  { key: "matrix", label: "Matrix" },
  { key: "list", label: "List" },
];

export function AppHeader({ activeView, searchQuery, onViewChange, onSearchChange, onAddTask, onImport, onExport }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="title-row">
        <h1>Priority Board</h1>
        <div className="view-switcher" aria-label="Choose board view">
          {views.map((view) => (
            <button
              type="button"
              className={view.key === activeView ? "is-selected" : ""}
              aria-pressed={view.key === activeView}
              key={view.key}
              onClick={() => onViewChange(view.key)}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="header-actions">
        <label className="search-field">
          <span className="sr-only">Search tasks</span>
          <Search size={17} aria-hidden="true" />
          <input type="search" value={searchQuery} placeholder="Search tasks" onChange={(event) => onSearchChange(event.target.value)} />
          {searchQuery ? (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onSearchChange("")}>
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <button type="button" className="secondary-button" onClick={onImport}>
          <Upload size={16} aria-hidden="true" />
          Import
        </button>
        <button type="button" className="secondary-button" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          Export
        </button>
        <button type="button" className="primary-button" onClick={onAddTask}>
          <Plus size={17} aria-hidden="true" />
          Add Task
        </button>
      </div>
    </header>
  );
}
