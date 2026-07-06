import { useEffect, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { QUADRANT_META, QUADRANT_ORDER, STATUS_ORDER } from "../constants";
import { getQuadrantLabel, getStatusLabel, isValidDateString, normalizeTags } from "../taskUtils";
import type { Task, TaskFormValues, TaskStatus } from "../types";

type TaskModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: TaskFormValues, taskId?: string) => void;
  onDelete: (task: Task) => void;
};

type FormErrors = {
  title?: string;
  description?: string;
  dueDate?: string;
};

function valuesFromTask(task: Task | null): TaskFormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "todo",
    urgent: task?.urgent ?? false,
    important: task?.important ?? false,
    dueDate: task?.dueDate ?? null,
    tags: task?.tags ?? [],
  };
}

function validate(values: TaskFormValues): FormErrors {
  const errors: FormErrors = {};
  const title = values.title.trim();
  const description = values.description.trim();

  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length > 120) {
    errors.title = "Title must be 120 characters or fewer.";
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or fewer.";
  }

  if (values.dueDate && !isValidDateString(values.dueDate)) {
    errors.dueDate = "Choose a valid due date.";
  }

  return errors;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter((element) => !element.hasAttribute("disabled"));
}

export function TaskModal({ task, isOpen, onClose, onSave, onDelete }: TaskModalProps) {
  const [values, setValues] = useState<TaskFormValues>(() => valuesFromTask(task));
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const modalRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const nextValues = valuesFromTask(task);
    setValues(nextValues);
    setTagInput(nextValues.tags.join(", "));
    setErrors({});
    window.setTimeout(() => titleRef.current?.focus(), 0);
  }, [isOpen, task]);

  if (!isOpen) return null;

  const save = () => {
    const nextValues = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate: values.dueDate || null,
      tags: normalizeTags(tagInput),
    };
    const nextErrors = validate(nextValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSave(nextValues, task?.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      save();
      return;
    }

    if (event.key === "Tab" && modalRef.current) {
      const focusable = focusableElements(modalRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        ref={modalRef}
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="task-modal-title">{task ? "Edit task" : "Add task"}</h2>
          <button type="button" className="icon-button" aria-label="Close task modal" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-grid">
          <label className="field span-2">
            <span>Title</span>
            <input
              ref={titleRef}
              value={values.title}
              maxLength={140}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(event) => setValues({ ...values, title: event.target.value })}
            />
            {errors.title ? (
              <span className="field-error" id="title-error">
                {errors.title}
              </span>
            ) : null}
          </label>

          <label className="field span-2">
            <span>Description</span>
            <textarea
              value={values.description}
              maxLength={1100}
              rows={4}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
            />
            <small>{values.description.length}/1000</small>
            {errors.description ? (
              <span className="field-error" id="description-error">
                {errors.description}
              </span>
            ) : null}
          </label>

          <label className="field">
            <span>Status</span>
            <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as TaskStatus })}>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={values.dueDate ?? ""}
              aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? "due-date-error" : undefined}
              onChange={(event) => setValues({ ...values, dueDate: event.target.value || null })}
            />
            {errors.dueDate ? (
              <span className="field-error" id="due-date-error">
                {errors.dueDate}
              </span>
            ) : null}
          </label>

          <fieldset className="field toggle-group">
            <legend>Priority</legend>
            <label className="toggle-row">
              <input type="checkbox" checked={values.urgent} onChange={(event) => setValues({ ...values, urgent: event.target.checked })} />
              <span>Urgent</span>
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={values.important} onChange={(event) => setValues({ ...values, important: event.target.checked })} />
              <span>Important</span>
            </label>
          </fieldset>

          <label className="field">
            <span>Quadrant</span>
            <select
              value={QUADRANT_ORDER.find((key) => QUADRANT_META[key].urgent === values.urgent && QUADRANT_META[key].important === values.important)}
              onChange={(event) => {
                const meta = QUADRANT_META[event.target.value as keyof typeof QUADRANT_META];
                setValues({ ...values, urgent: meta.urgent, important: meta.important });
              }}
            >
              {QUADRANT_ORDER.map((quadrant) => (
                <option value={quadrant} key={quadrant}>
                  {getQuadrantLabel(quadrant)}
                </option>
              ))}
            </select>
          </label>

          <label className="field span-2">
            <span>Tags</span>
            <input value={tagInput} placeholder="Planning, Admin" onChange={(event) => setTagInput(event.target.value)} />
            <small>Use commas to separate tags.</small>
          </label>
        </div>

        <div className="modal-actions">
          {task ? (
            <button type="button" className="danger-button" onClick={() => onDelete(task)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="modal-action-group">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={save}>
              <Check size={16} aria-hidden="true" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
