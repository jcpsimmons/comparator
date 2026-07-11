import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { STATUS_LABELS, TASK_STATUSES } from "../constants";
import { normalizeTags, validateTaskFields } from "../taskUtils";
import type { Task, TaskStatus } from "../types";

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string;
  tags: string;
};

type TaskModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Task | null;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
  onDelete?: () => void;
};

const emptyValues: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  urgent: false,
  important: false,
  dueDate: "",
  tags: "",
};

function taskToValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    urgent: task.urgent,
    important: task.important,
    dueDate: task.dueDate ?? "",
    tags: task.tags.join(", "),
  };
}

export function TaskModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const dueId = useId();
  const tagsId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<TaskFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(initial ? taskToValues(initial) : emptyValues);
    setError(null);
    const t = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const root = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const result = validateTaskFields({
      title: values.title,
      description: values.description,
      dueDate: values.dueDate || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      tags: normalizeTags(values.tags).join(", "),
    });
  };

  const onFormKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onFormKeyDown}
      >
        <div className="modal-header">
          <h2 id="task-modal-title">
            {mode === "create" ? "Add Task" : "Edit Task"}
          </h2>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor={titleId}>Title</label>
            <input
              ref={titleRef}
              id={titleId}
              type="text"
              maxLength={120}
              required
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor={descId}>Description</label>
            <textarea
              id={descId}
              maxLength={1000}
              rows={3}
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor={statusId}>Status</label>
              <select
                id={statusId}
                value={values.status}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    status: e.target.value as TaskStatus,
                  }))
                }
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={dueId}>Due date</label>
              <input
                id={dueId}
                type="date"
                value={values.dueDate}
                onChange={(e) =>
                  setValues((v) => ({ ...v, dueDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="field-row toggles">
            <label className="toggle">
              <input
                type="checkbox"
                checked={values.urgent}
                onChange={(e) =>
                  setValues((v) => ({ ...v, urgent: e.target.checked }))
                }
              />
              <span>Urgent</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={values.important}
                onChange={(e) =>
                  setValues((v) => ({ ...v, important: e.target.checked }))
                }
              />
              <span>Important</span>
            </label>
          </div>

          <div className="field">
            <label htmlFor={tagsId}>Tags</label>
            <input
              id={tagsId}
              type="text"
              placeholder="Planning, Admin"
              value={values.tags}
              onChange={(e) => setValues((v) => ({ ...v, tags: e.target.value }))}
            />
            <span className="field-hint">Comma-separated</span>
          </div>

          <div className="modal-footer">
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
