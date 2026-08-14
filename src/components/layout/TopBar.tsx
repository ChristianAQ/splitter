import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: boolean;
  right?: ReactNode;
}

export function TopBar({ title, subtitle, onBack, right }: Props) {
  const navigate = useNavigate();
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 bg-surface-light-subtle/90 px-4 pb-3 backdrop-blur-lg dark:bg-surface-dark/90"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
    >
      {onBack && (
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 shadow-card active:scale-95 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <ArrowLeft size={19} strokeWidth={2.25} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
