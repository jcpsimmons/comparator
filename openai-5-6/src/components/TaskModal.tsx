import { Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { isValidDueDate, normalizeTags } from "../taskUtils";
import type { Task, TaskStatus } from "../types";

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string | null;
  tags: string[];
}

export interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  onSave: (values: TaskFormValues) => void | Promise<void>;
  onClose: () => void;
  onDelete?: (task: Task) => void;
}

interface TaskFormState {
  title: string;
  description: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  dueDate: string;
  tagsInput: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  submit?: string;
}

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  urgent: false,
  important: false,
  dueDate: "",
  tagsInput: "",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function stateFromTask(task: Task | null | undefined): TaskFormState {
  if (!task) {
    return { ...EMPTY_FORM };
  }

  return {
    title: task.title,
    description: task.description,
    status: task.status,
    urgent: task.urgent,
    important: task.important,
    dueDate: task.dueDate ?? "",
    tagsInput: task.tags.join(", "),
  };
}

function validateForm(values: TaskFormState): FormErrors {
  const errors: FormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = "Enter a title for this task.";
  } else if (title.length > 120) {
    errors.title = "Title must be 120 characters or fewer.";
  }

  if (values.description.length > 1000) {
    errors.description = "Description must be 1,000 characters or fewer.";
  }

  if (values.dueDate && !isValidDueDate(values.dueDate)) {
    errors.dueDate = "Choose a valid due date.";
  }

  return errors;
}

export function TaskModal({ isOpen, task = null, onSave, onClose, onDelete }: TaskModalProps) {
  const [values, setValues] = useState<TaskFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const headingId = useId();
  const instructionsId = useId();
  const titleErrorId = useId();
  const descriptionErrorId = useId();
  const dueDateErrorId = useId();
  const submitErrorId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValues(stateFromTask(task));
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen, task]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === first || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateValue = <Key extends keyof TaskFormState>(key: Key, value: TaskFormState[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));

    if (key === "title" || key === "description" || key === "dueDate") {
      setErrors((current) => ({ ...current, [key]: undefined, submit: undefined }));
    } else {
      setErrors((current) => ({ ...current, submit: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    if (nextErrors.title) {
      titleRef.current?.focus();
      return;
    }

    if (nextErrors.description) {
      formRef.current?.querySelector<HTMLTextAreaElement>("#task-description")?.focus();
      return;
    }

    if (nextErrors.dueDate) {
      formRef.current?.querySelector<HTMLInputElement>("#task-due-date")?.focus();
      return;
    }

    const normalizedValues: TaskFormValues = {
      title: values.title.trim(),
      description: values.description.trim(),
      status: values.status,
      urgent: values.urgent,
      important: values.important,
      dueDate: values.dueDate || null,
      tags: normalizeTags(values.tagsInput),
    };

    try {
      setIsSubmitting(true);
      await onSave(normalizedValues);
      onClose();
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit: error instanceof Error ? error.message : "The task could not be saved. Try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!task || !onDelete) {
      return;
    }

    if (window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      onDelete(task);
      onClose();
    }
  };

  const handleTagsBlur = () => {
    updateValue("tagsInput", normalizeTags(values.tagsInput).join(", "));
  };

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={instructionsId}
        tabIndex={-1}
      >
        <div className="task-modal__header">
          <div>
            <p className="task-modal__eyebrow">{task ? "Edit task" : "New task"}</p>
            <h2 id={headingId}>{task ? "Update task" : "Add a task"}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close task editor"
            onClick={onClose}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <p id={instructionsId} className="visually-hidden">
          All task details can be changed here. Press Control or Command and Enter to save, or
          Escape to cancel.
        </p>

        <form ref={formRef} className="task-form" onSubmit={handleSubmit} noValidate>
          <label className="form-field" htmlFor="task-title">
            <span className="form-field__label">
              Title <span aria-hidden="true">*</span>
            </span>
            <input
              ref={titleRef}
              id="task-title"
              type="text"
              value={values.title}
              maxLength={120}
              required
              autoComplete="off"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? titleErrorId : undefined}
              onChange={(event) => updateValue("title", event.currentTarget.value)}
            />
            <span className="form-field__meta" aria-live="polite">
              {values.title.length}/120
            </span>
            {errors.title ? (
              <span id={titleErrorId} className="form-field__error" role="alert">
                {errors.title}
              </span>
            ) : null}
          </label>

          <label className="form-field" htmlFor="task-description">
            <span className="form-field__label">Description</span>
            <textarea
              id="task-description"
              value={values.description}
              maxLength={1000}
              rows={5}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? descriptionErrorId : undefined}
              onChange={(event) => updateValue("description", event.currentTarget.value)}
            />
            <span className="form-field__meta" aria-live="polite">
              {values.description.length}/1000
            </span>
            {errors.description ? (
              <span id={descriptionErrorId} className="form-field__error" role="alert">
                {errors.description}
              </span>
            ) : null}
          </label>

          <div className="task-form__row">
            <label className="form-field" htmlFor="task-status">
              <span className="form-field__label">Status</span>
              <select
                id="task-status"
                value={values.status}
                onChange={(event) => updateValue("status", event.currentTarget.value as TaskStatus)}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="inProgress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label className="form-field" htmlFor="task-due-date">
              <span className="form-field__label">Due date</span>
              <input
                id="task-due-date"
                type="date"
                value={values.dueDate}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
                onChange={(event) => updateValue("dueDate", event.currentTarget.value)}
              />
              {errors.dueDate ? (
                <span id={dueDateErrorId} className="form-field__error" role="alert">
                  {errors.dueDate}
                </span>
              ) : null}
            </label>
          </div>

          <fieldset className="priority-toggles">
            <legend>Priority</legend>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={values.urgent}
                onChange={(event) => updateValue("urgent", event.currentTarget.checked)}
              />
              <span>
                <strong>Urgent</strong>
                <small>Needs attention soon</small>
              </span>
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={values.important}
                onChange={(event) => updateValue("important", event.currentTarget.checked)}
              />
              <span>
                <strong>Important</strong>
                <small>Contributes to key goals</small>
              </span>
            </label>
          </fieldset>

          <label className="form-field" htmlFor="task-tags">
            <span className="form-field__label">Tags</span>
            <input
              id="task-tags"
              type="text"
              value={values.tagsInput}
              placeholder="Planning, Admin, Review"
              autoComplete="off"
              onChange={(event) => updateValue("tagsInput", event.currentTarget.value)}
              onBlur={handleTagsBlur}
            />
            <span className="form-field__hint">
              Separate tags with commas. Duplicates are removed automatically.
            </span>
          </label>

          {errors.submit ? (
            <p id={submitErrorId} className="task-form__submit-error" role="alert">
              {errors.submit}
            </p>
          ) : null}

          <div className="task-modal__footer">
            <div>
              {task && onDelete ? (
                <button
                  className="button button--danger-ghost"
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Delete</span>
                </button>
              ) : null}
            </div>
            <div className="task-modal__footer-actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                type="submit"
                disabled={isSubmitting}
                aria-describedby={errors.submit ? submitErrorId : undefined}
              >
                {isSubmitting ? "Saving…" : task ? "Save changes" : "Add task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
