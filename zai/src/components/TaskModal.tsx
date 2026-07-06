import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  DESCRIPTION_MAX,
  STATUS_LABELS,
  TITLE_MAX,
} from "../constants";
import { normalizeTags } from "../taskUtils";
import type { Task, TaskInput, TaskStatus } from "../types";

interface TaskModalProps {
  open: boolean;
  initial?: Task | null;
  onClose: () => void;
  onSave: (input: TaskInput, id?: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_VALUES: TaskStatus[] = ["backlog", "todo", "inProgress", "done"];

export function TaskModal({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setStatus(initial.status);
      setUrgent(initial.urgent);
      setImportant(initial.important);
      setDueDate(initial.dueDate ?? "");
      setTags(initial.tags.join(", "));
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setUrgent(false);
      setImportant(false);
      setDueDate("");
      setTags("");
    }
    setError(null);
    const t = window.setTimeout(() => titleRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, initial]);

  // Focus trap + escape
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, description, status, urgent, important, dueDate, tags]);

  if (!open) return null;

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setError(`Title must be ${TITLE_MAX} characters or fewer.`);
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      setError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
      return;
    }
    const due = dueDate.trim();
    if (due && !isValidDate(due)) {
      setError("Due date must be a valid YYYY-MM-DD date or empty.");
      return;
    }
    const input: TaskInput = {
      title: trimmedTitle,
      description: description.trim(),
      status,
      urgent,
      important,
      dueDate: due || null,
      tags: normalizeTags(tags),
    };
    onSave(input, initial?.id);
    onClose();
  }

  function handleDelete() {
    if (!initial) return;
    if (!onDelete) return;
    if (window.confirm(`Delete "${initial.title}"? This cannot be undone.`)) {
      onDelete(initial.id);
      onClose();
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="modal"
      >
        <div className="modal-header">
          <h2 id="task-modal-title">
            {initial ? "Edit Task" : "Add Task"}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span className="field-label">
              Title <span className="req" aria-hidden="true">*</span>
            </span>
            <input
              ref={titleRef}
              type="text"
              className="input"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              aria-required="true"
            />
            <span className="field-hint">
              {title.length}/{TITLE_MAX}
            </span>
          </label>

          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="input textarea"
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="field-hint">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Due date</span>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
              />
              <span>Urgent</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={important}
                onChange={(e) => setImportant(e.target.checked)}
              />
              <span>Important</span>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Tags (comma-separated)</span>
            <input
              type="text"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Planning, Admin"
            />
          </label>

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modal-footer">
          {initial && onDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
            >
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          )}
          <div className="modal-footer-right">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return (
    !isNaN(dt.getTime()) &&
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}
