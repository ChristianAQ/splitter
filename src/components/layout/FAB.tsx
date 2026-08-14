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
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent-500/30 active:scale-95 transition-transform"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
    >
      <Plus size={27} strokeWidth={2.25} />
    </button>
  );
}
