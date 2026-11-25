import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { haptic } from "../../lib/haptics";
import { expandChrome, useCompactChrome } from "../../hooks/useCompactChrome";

/** iOS's own easing for interface motion: a fast start that settles softly. */
export const IOS_SPRING = "duration-[480ms] ease-[cubic-bezier(0.32,0.72,0,1)]";
import { Home, WalletMinimal, Users, ChartColumn, Settings, type LucideIcon } from "lucide-react";

const ITEMS: { to: string; label: string; icon: LucideIcon; also?: string[] }[] = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/gastos", label: "Gastos", icon: WalletMinimal },
  // Amigos is reached from Grupos and has no tab of its own.
  { to: "/grupos", label: "Grupos", icon: Users, also: ["/amigos"] },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartColumn },
  { to: "/perfil", label: "Perfil", icon: Settings },
];

function matches(pathname: string, item: (typeof ITEMS)[number]) {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Floating glass tab bar. Tapping the current tab scrolls it to the top. One shared highlight glides between tabs; which
 * tab is "active" is computed here once (not per-NavLink) so the highlight
 * and the icon it sits behind can never disagree — they used to on
 * /amigos, where the pill fell back to Inicio while no tab was lit. */
export function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = ITEMS.findIndex((item) => matches(pathname, item));
  const compact = useCompactChrome();

  // Every new page starts with the bar at full size.
  useEffect(() => expandChrome(), [pathname]);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom) - 8px), 10px)" }}
      aria-label="Navegación principal"
    >
      {/* Content scrolling past the bar dissolves into the page color
       * instead of peeking out, sharp, in the gap below a floating pill. */}
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 -top-8 bg-gradient-to-t from-surface-light-subtle from-35% to-transparent transition-opacity ${IOS_SPRING} dark:from-surface-dark ${
          compact ? "opacity-60" : ""
        }`}
      />
      <div
        // Minimized while scrolling down: narrower, shorter, labels folded
        // away — every change animated on the same curve, so it reads as
        // one motion. A tap on it brings it back to full size.
        onPointerDown={() => compact && expandChrome()}
        className={`glass pointer-events-auto relative mx-auto flex rounded-[30px] transition-[max-width,padding] ${IOS_SPRING} ${
          compact ? "max-w-[272px] p-1" : "max-w-md p-1.5"
        }`}
      >
        {activeIndex >= 0 && (
          <div
            className={`pointer-events-none absolute left-0 transition-[transform,top,bottom,left,width] ${IOS_SPRING} ${compact ? "inset-y-1" : "inset-y-1.5"}`}
            style={{
              left: compact ? "0.25rem" : "0.375rem",
              width: compact ? "calc((100% - 0.5rem) / 5)" : "calc((100% - 0.75rem) / 5)",
              transform: `translateX(${activeIndex * 100}%)`,
            }}
            aria-hidden
          >
            <div className="h-full w-full rounded-[24px] bg-accent/[0.13] dark:bg-accent/25" />
          </div>
        )}

        {ITEMS.map((item, i) => {
          const active = i === activeIndex;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                haptic();
                // Tapping the tab you're already on takes you back to the
                // top of it, as in any iPhone app — or, from a screen
                // under it (a group), back to the tab itself.
                if (active && pathname === item.to) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={`relative z-10 flex min-w-0 flex-1 flex-col items-center rounded-[24px] text-[10.5px] font-medium transition-[color,padding] ${IOS_SPRING} active:opacity-70 ${
                compact ? "py-1.5" : "py-2"
              } ${active ? "text-accent-700 dark:text-accent-200" : "text-neutral-500 dark:text-neutral-400"}`}
            >
              <item.icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={`transition-transform ${IOS_SPRING} ${active ? (compact ? "scale-100" : "-translate-y-px scale-105") : compact ? "scale-95" : ""}`}
              />
              {/* Folds to nothing through grid rows, so the height eases
               * instead of jumping. */}
              <span
                aria-hidden
                className={`grid w-full transition-[grid-template-rows,opacity] ${IOS_SPRING} ${compact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
              >
                <span className="overflow-hidden">
                  <span className={`block truncate px-0.5 pt-0.5 text-center ${active ? "font-semibold" : ""}`}>{item.label}</span>
                </span>
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
