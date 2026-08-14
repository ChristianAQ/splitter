import type { ReactNode } from "react";

interface Props {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center animate-fade-in">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      {description && <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
