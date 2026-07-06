import { useEffect, useRef, useState } from "react";
import { isValid, parseISO } from "date-fns";
import { Trash2, X } from "lucide-react";
import { DESCRIPTION_MAX, STATUS_LABELS, STATUS_ORDER, TITLE_MAX } from "../constants";
import { normalizeTags } from "../taskUtils";
import type { Task, TaskDraft, TaskStatus } from "../types";

type TaskModalProps = {
  task: Task | null; // null = creating a new task
  onSave: (draft: TaskDraft) => void;
  onCancel: () => void;
  onDelete: (task: Task) => void;
};

type FieldErrors = {
  title?: string;
  description?: string;
  dueDate?: string;
};

export function TaskModal({ task, onSave, onCancel, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [urgent, setUrgent] = useState(task?.urgent ?? false);
  const [important, setImportant] = useState(task?.important ?? false);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [tagsInput, setTagsInput] = useState(task?.tags.join(", ") ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    titleInputRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  function validate(): { draft: TaskDraft | null; errors: FieldErrors } {
    const nextErrors: FieldErrors = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      nextErrors.title = "Title is required.";
    } else if (trimmedTitle.length > TITLE_MAX) {
      nextErrors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
    }
    if (description.length > DESCRIPTION_MAX) {
      nextErrors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
    }
    if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !isValid(parseISO(dueDate)))) {
      nextErrors.dueDate = "Due date must be a valid date.";
    }
    if (Object.keys(nextErrors).length > 0) {
      return { draft: null, errors: nextErrors };
    }
    return {
      draft: {
        title: trimmedTitle,
        description: description.trim(),
        status,
        urgent,
        important,
        dueDate: dueDate || null,
        tags: normalizeTags(tagsInput),
      },
      errors: {},
    };
  }

  function handleSave() {
    const { draft, errors: nextErrors } = validate();
    setErrors(nextErrors);
    if (draft) onSave(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
      return;
    }
    if (e.key === "Tab") {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const editing = task !== null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id="task-modal-title">{editing ? "Edit Task" : "Add Task"}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onCancel}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <form
          className="modal-body"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="field">
            <label htmlFor="task-title">
              Title <span className="field-required">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "task-title-error" : undefined}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <p className="field-error" id="task-title-error" role="alert">
                {errors.title}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              maxLength={DESCRIPTION_MAX}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "task-description-error" : undefined}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && (
              <p className="field-error" id="task-description-error" role="alert">
                {errors.description}
              </p>
            )}
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? "task-due-date-error" : undefined}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {errors.dueDate && (
                <p className="field-error" id="task-due-date-error" role="alert">
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>
          <div className="field-row">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
              />
              <span>Urgent</span>
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={important}
                onChange={(e) => setImportant(e.target.checked)}
              />
              <span>Important</span>
            </label>
          </div>
          <div className="field">
            <label htmlFor="task-tags">Tags</label>
            <input
              id="task-tags"
              type="text"
              placeholder="Comma-separated, e.g. Planning, Admin"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            {editing && (
              <button
                type="button"
                className="button button-danger"
                onClick={() => onDelete(task)}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Delete</span>
              </button>
            )}
            <div className="modal-footer-main">
              <button type="button" className="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="button button-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
