import type { ReactNode } from "react";

type BadgeProps = {
  tone:
    | "backlog"
    | "todo"
    | "inProgress"
    | "done"
    | "doNow"
    | "schedule"
    | "delegate"
    | "eliminate"
    | "overdue"
    | "dueToday"
    | "dueSoon"
    | "dueLater"
    | "tag";
  children: ReactNode;
  title?: string;
};

export function Badge({ tone, children, title }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}
