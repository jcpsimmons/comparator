import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function Badge({ children, className = "", title }: BadgeProps) {
  return (
    <span className={`badge ${className}`.trim()} title={title}>
      {children}
    </span>
  );
}
