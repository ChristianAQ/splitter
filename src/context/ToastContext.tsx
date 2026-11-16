import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setLateWriteFailureHandler } from "../lib/commit";

export type ToastVariant = "default" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  /** `action` adds a button to the toast (e.g. "Deshacer") and keeps it on
   * screen a little longer so there's time to reach it. */
  show: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "default", action?: ToastAction) => {
      const id = idRef.current++;
      // Never more than three at once: a quick run of actions would
      // otherwise stack a tower of toasts over the list being edited.
      setToasts((prev) => [...prev.slice(-2), { id, message, variant, action }]);
      window.setTimeout(() => dismiss(id), action ? 5500 : 3200);
    },
    [dismiss]
  );

  // A write the UI didn't wait for (see lib/commit.ts) and that the server
  // ended up rejecting: the change has already been rolled back on screen,
  // so say why.
  useEffect(() => {
    setLateWriteFailureHandler((error) => show(`No se pudo guardar un cambio. ${error.message}`, "error"));
    return () => setLateWriteFailureHandler(() => {});
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4"
        // Clear of both the tab bar and the + button above it (see
        // BottomNav/FAB for the matching offsets) — it used to sit level
        // with the button and run underneath it.
        style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom) - 8px, 10px) + 146px)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm animate-rise items-center gap-3 rounded-full py-2.5 text-sm font-medium shadow-sheet backdrop-blur-xl ${
              t.action ? "pl-4 pr-2" : "px-4"
            } ${
              t.variant === "success"
                ? "bg-positive/90 text-white"
                : t.variant === "error"
                  ? "bg-negative/90 text-white"
                  : "bg-neutral-900/85 text-white dark:bg-white/90 dark:text-neutral-900"
            }`}
          >
            <span className="min-w-0">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="pressable shrink-0 rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold dark:bg-black/10"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
