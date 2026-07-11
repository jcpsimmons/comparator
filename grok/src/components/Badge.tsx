import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "status"
  | "doNow"
  | "schedule"
  | "delegate"
  | "eliminate"
  | "done"
  | "overdue"
  | "today"
  | "soon"
  | "tag";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}${className ? ` ${className}` : ""}`}>
      {children}
    </span>
  );
}
