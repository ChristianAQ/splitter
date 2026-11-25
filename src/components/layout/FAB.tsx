import { Plus } from "lucide-react";
import { useCompactChrome } from "../../hooks/useCompactChrome";

const SPRING = "480ms cubic-bezier(0.32, 0.72, 0, 1)";

interface Props {
  onClick: () => void;
  label?: string;
}

/** Global quick-add button — the shortest path to "add an expense" from
 * anywhere in the app, per the core UX priority. */
export function FAB({ onClick, label = "Añadir gasto" }: Props) {
  // Rides down with the tab bar when it minimizes (useCompactChrome).
  const compact = useCompactChrome();
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`pressable fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent/90 text-white shadow-[0_14px_30px_-10px_rgb(var(--accent-600)/0.85)] ring-1 ring-inset ring-white/25 backdrop-blur-xl`}
      style={{
        bottom: "calc(max(env(safe-area-inset-bottom) - 8px, 10px) + 78px)",
        // `translate`/`scale` rather than `transform`, which .pressable
        // uses for its press-down — the two would cancel each other out.
        translate: compact ? "0 24px" : "0 0",
        scale: compact ? "0.9" : "1",
        transition: `translate ${SPRING}, scale ${SPRING}, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease-out`,
      }}
    >
      <Plus size={26} strokeWidth={2.2} />
    </button>
  );
}
