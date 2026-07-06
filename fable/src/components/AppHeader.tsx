import { useRef } from "react";
import { Columns3, Download, Grid2x2, List, Plus, Search, Upload, X } from "lucide-react";
import type { AppView } from "../types";

type AppHeaderProps = {
  activeView: AppView;
  searchQuery: string;
  onViewChange: (view: AppView) => void;
  onSearchChange: (query: string) => void;
  onAddTask: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
};

const VIEWS: { key: AppView; label: string; icon: typeof Columns3 }[] = [
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "matrix", label: "Matrix", icon: Grid2x2 },
  { key: "list", label: "List", icon: List },
];

export function AppHeader({
  activeView,
  searchQuery,
  onViewChange,
  onSearchChange,
  onAddTask,
  onExport,
  onImportFile,
}: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-header">
      <h1 className="app-title">Priority Board</h1>
      <nav className="view-switcher" aria-label="Board view">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`view-button${activeView === key ? " view-button-active" : ""}`}
            aria-pressed={activeView === key}
            onClick={() => onViewChange(key)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="search-box">
        <Search size={15} className="search-icon" aria-hidden="true" />
        <input
          type="search"
          className="search-input"
          placeholder="Search tasks…"
          aria-label="Search tasks by title, description, or tag"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="icon-button search-clear"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={onAddTask}
          aria-label="Add task"
        >
          <Plus size={15} aria-hidden="true" />
          <span>Add Task</span>
        </button>
        <button
          type="button"
          className="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import board from JSON file"
        >
          <Upload size={15} aria-hidden="true" />
          <span>Import</span>
        </button>
        <button
          type="button"
          className="button"
          onClick={onExport}
          aria-label="Export board as JSON file"
        >
          <Download size={15} aria-hidden="true" />
          <span>Export</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
