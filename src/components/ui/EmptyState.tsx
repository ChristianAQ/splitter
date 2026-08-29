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
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center animate-fade-in">
      <Icon size={44} strokeWidth={1.5} className="text-neutral-300 dark:text-neutral-600" />
      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      {description && <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
