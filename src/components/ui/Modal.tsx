import type { ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disables both buttons and spins the confirm one while the action runs,
   * so a second tap can't fire it twice. */
  busy?: boolean;
  children?: ReactNode;
}

/** Confirmation dialog for destructive/important actions — per spec,
 * destructive actions always require an explicit confirm step. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  onCancel,
  busy,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-fade-in bg-neutral-950/35 backdrop-blur-[3px]" onClick={busy ? undefined : onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="glass-sheet relative w-full max-w-sm animate-scale-in rounded-[28px] p-5 shadow-sheet"
      >
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
        {children}
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} className="flex-1" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
