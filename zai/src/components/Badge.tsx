import type { ReactNode } from "react";

export type BadgeVariant =
  | "red"
  | "blue"
  | "amber"
  | "gray"
  | "green"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  title?: string;
}

export function Badge({ variant = "neutral", children, title }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`} title={title}>
      {children}
    </span>
  );
}
