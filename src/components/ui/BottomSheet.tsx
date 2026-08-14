import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-sheet animate-slide-up dark:bg-surface-dark-subtle sm:max-w-md sm:rounded-3xl sm:animate-scale-in"
      >
        <div className="flex shrink-0 items-center justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">{children}</div>
      </div>
    </div>
  );
}
