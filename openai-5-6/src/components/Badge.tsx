import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "red" | "blue" | "amber" | "green";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = "neutral", className = "", ...props }: BadgeProps) {
  const classes = ["badge", `badge--${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

export default Badge;
