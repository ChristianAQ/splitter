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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-neutral-950/35 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-sheet relative flex max-h-[90vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-[32px] border-b-0 shadow-sheet sm:max-w-md sm:animate-scale-in sm:rounded-[32px] sm:border-b"
      >
        <div className="flex shrink-0 items-center justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-neutral-900/15 dark:bg-white/20" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="well well-press pressable flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">{children}</div>
      </div>
    </div>
  );
}
