import { ListTodo, Plus, SearchX, X } from "lucide-react";

export type EmptyStateVariant = "global" | "filtered";

export type EmptyStateProps = {
  variant: EmptyStateVariant;
  onAction: () => void;
  actionLabel?: string;
};

const EMPTY_STATE_COPY: Record<
  EmptyStateVariant,
  { title: string; description: string; actionLabel: string }
> = {
  global: {
    title: "No tasks yet",
    description: "Add your first task to start organizing your priorities.",
    actionLabel: "Add Task",
  },
  filtered: {
    title: "No tasks match the current filters",
    description: "Try removing one or more filters to see more tasks.",
    actionLabel: "Clear filters",
  },
};

export function EmptyState({ variant, onAction, actionLabel }: EmptyStateProps) {
  const copy = EMPTY_STATE_COPY[variant];
  const Icon = variant === "global" ? ListTodo : SearchX;
  const ActionIcon = variant === "global" ? Plus : X;

  return (
    <section className={`empty-state empty-state--${variant}`} aria-live="polite">
      <Icon className="empty-state__icon" aria-hidden="true" />
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <button className="button button--primary" type="button" onClick={onAction}>
        <ActionIcon aria-hidden="true" />
        {actionLabel ?? copy.actionLabel}
      </button>
    </section>
  );
}

export default EmptyState;
