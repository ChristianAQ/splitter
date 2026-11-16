import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex animate-rise flex-col items-center justify-center gap-2 px-8 py-14 text-center">
      <span className="well mb-1 flex h-16 w-16 items-center justify-center rounded-full text-neutral-400 dark:text-neutral-500">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <h3 className="text-base font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">{title}</h3>
      {description && <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
