import { Plus } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
  showAction?: boolean;
}

export function EmptyState({
  title,
  message,
  onAction,
  actionLabel = "Add Task",
  showAction = true,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-message">{message}</p>}
      {showAction && onAction && (
        <button className="btn btn-primary" onClick={onAction} type="button">
          <Plus size={16} aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
