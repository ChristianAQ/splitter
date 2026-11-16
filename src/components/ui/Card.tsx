import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  // The default padding is dropped when the caller sets its own: with both
  // `p-4` and e.g. `p-0` on the element, which one wins depends on their
  // order in the generated stylesheet, not on the order written here — the
  // profile header's edge-to-edge banner was being inset by it.
  const padding = /(^|\s)p-\d/.test(className) ? "" : "p-4";
  return <div className={`surface rounded-[22px] ${padding} ${className}`} {...rest} />;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "positive" | "negative" | "accent" | "warning" }) {
  const toneClasses = {
    neutral: "well text-neutral-600 dark:text-neutral-300",
    positive: "bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark",
    negative: "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-dark",
    accent: "bg-accent/10 text-accent-700 dark:bg-accent/20 dark:text-accent-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  }[tone];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClasses}`}>{children}</span>;
}
