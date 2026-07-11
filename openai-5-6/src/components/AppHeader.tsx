import { Columns3, Download, Grid2X2, List, Plus, Search, Upload, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";
import type { AppView } from "../types";

export interface AppHeaderProps {
  activeView: AppView;
  searchQuery: string;
  totalTasks: number;
  visibleTasks: number;
  onViewChange: (view: AppView) => void;
  onSearchChange: (query: string) => void;
  onAddTask: () => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
  title?: string;
}

interface ViewOption {
  value: AppView;
  label: string;
  icon: typeof Columns3;
}

const VIEW_OPTIONS: readonly ViewOption[] = [
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "matrix", label: "Matrix", icon: Grid2X2 },
  { value: "list", label: "List", icon: List },
];

function taskCountLabel(count: number): string {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

export function AppHeader({
  activeView,
  searchQuery,
  totalTasks,
  visibleTasks,
  onViewChange,
  onSearchChange,
  onAddTask,
  onImport,
  onExport,
  title = "Priority Board",
}: AppHeaderProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (file) {
      void onImport(file);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header__title-row">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            <Grid2X2 size={20} />
          </span>
          <h1 className="app-header__title">{title}</h1>
        </div>

        <fieldset className="view-switcher">
          <legend className="visually-hidden">Choose board view</legend>
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              className="view-switcher__button"
              type="button"
              key={value}
              aria-pressed={activeView === value}
              onClick={() => onViewChange(value)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </fieldset>
      </div>

      <div className="app-header__tools">
        <search className="search-field">
          <label className="visually-hidden" htmlFor="task-search">
            Search tasks
          </label>
          <Search className="search-field__icon" size={17} aria-hidden="true" />
          <input
            id="task-search"
            className="search-field__input"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search tasks"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              className="search-field__clear"
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </search>

        <p className="app-header__summary" aria-live="polite">
          {taskCountLabel(totalTasks)} · {visibleTasks} visible
        </p>

        <div className="app-header__actions">
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleImportChange}
          />
          <button
            className="button button--secondary"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            <span>Import</span>
          </button>
          <button className="button button--secondary" type="button" onClick={onExport}>
            <Download size={16} aria-hidden="true" />
            <span>Export</span>
          </button>
          <button className="button button--primary" type="button" onClick={onAddTask}>
            <Plus size={17} aria-hidden="true" />
            <span>Add task</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
