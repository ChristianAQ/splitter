import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-card dark:bg-surface-dark-subtle ${className}`}
      {...rest}
    />
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "positive" | "negative" | "accent" }) {
  const toneClasses = {
    neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    positive: "bg-positive-light text-positive dark:bg-positive/20 dark:text-positive-dark",
    negative: "bg-negative-light text-negative dark:bg-negative/20 dark:text-negative-dark",
    accent: "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>{children}</span>;
}
