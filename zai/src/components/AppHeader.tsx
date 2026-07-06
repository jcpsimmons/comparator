import { useRef } from "react";
import {
  Download,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { VIEW_LABELS } from "../constants";
import type { AppView } from "../types";

interface AppHeaderProps {
  activeView: AppView;
  searchQuery: string;
  onViewChange: (v: AppView) => void;
  onSearchChange: (q: string) => void;
  onAddTask: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  importError: string | null;
}

const VIEW_ORDER: AppView[] = ["kanban", "matrix", "list"];

export function AppHeader({
  activeView,
  searchQuery,
  onViewChange,
  onSearchChange,
  onAddTask,
  onExport,
  onImport,
  importError,
}: AppHeaderProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="app-header-brand">
          <h1 className="app-title">Priority Board</h1>
        </div>

        <div className="view-switcher" role="tablist" aria-label="View switcher">
          {VIEW_ORDER.map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={activeView === v}
              className={`tab-btn${activeView === v ? " is-active" : ""}`}
              onClick={() => onViewChange(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <div className="app-header-search">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <label htmlFor="search-input" className="visually-hidden">
            Search tasks
          </label>
          <input
            id="search-input"
            type="search"
            className="input search-input"
            placeholder="Search title, description, tags…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="icon-btn search-clear"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="app-header-actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
            aria-label="Import board from JSON"
          >
            <Upload size={14} aria-hidden="true" /> Import
          </button>
          <button
            type="button"
            className="btn"
            onClick={onExport}
            aria-label="Export board as JSON"
          >
            <Download size={14} aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddTask}
          >
            <Plus size={14} aria-hidden="true" /> Add Task
          </button>
        </div>
      </div>
      {importError && (
        <p className="header-error" role="alert">
          {importError}
        </p>
      )}
    </header>
  );
}
