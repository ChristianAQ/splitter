import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
  label?: string;
}

/** Global quick-add button — the shortest path to "add an expense" from
 * anywhere in the app, per the core UX priority. */
export function FAB({ onClick, label = "Añadir gasto" }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="pressable fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent/90 text-white shadow-[0_14px_30px_-10px_rgb(var(--accent-600)/0.85)] ring-1 ring-inset ring-white/25 backdrop-blur-xl"
      style={{ bottom: "calc(max(env(safe-area-inset-bottom) - 8px, 10px) + 78px)" }}
    >
      <Plus size={26} strokeWidth={2.2} />
    </button>
  );
}
