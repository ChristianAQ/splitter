import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

// Same easing as the rest of the app's sheet/scale transitions (see
// tailwind.config.ts's slide-up/scale-in animations) — animating
// grid-template-rows (rather than max-height) lets the section grow/shrink
// to its exact content height with no fixed cap to guess at.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/** A section header that expands/collapses its content with a smooth
 * height + fade transition — used to let the Grupos page's sections
 * (Amigos/Activo/Archivado) be tucked away without losing their place. */
export function Collapsible({ title, defaultOpen = true, headerRight, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left active:opacity-60"
        >
          <ChevronDown
            size={16}
            strokeWidth={2.75}
            className={`shrink-0 text-neutral-400 transition-transform duration-300 ${EASE} ${open ? "" : "-rotate-90"}`}
          />
          <h2 className="truncate text-sm font-bold text-neutral-500 dark:text-neutral-400">{title}</h2>
        </button>
        {headerRight}
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ${EASE}`} style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className={`overflow-hidden transition-opacity duration-300 ${open ? "opacity-100 delay-75" : "opacity-0"}`}>{children}</div>
      </div>
    </section>
  );
}
