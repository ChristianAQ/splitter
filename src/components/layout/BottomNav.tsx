import { NavLink, useLocation } from "react-router-dom";
import { haptic } from "../../lib/haptics";
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
        className="absolute inset-x-0 bottom-0 -top-8 bg-gradient-to-t from-surface-light-subtle from-35% to-transparent dark:from-surface-dark"
      />
      <div className="glass pointer-events-auto relative mx-auto flex max-w-md rounded-[30px] p-1.5">
        {activeIndex >= 0 && (
          <div
            className="pointer-events-none absolute inset-y-1.5 left-1.5 transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: "calc((100% - 0.75rem) / 5)", transform: `translateX(${activeIndex * 100}%)` }}
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
              className={`relative z-10 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[24px] py-2 text-[10.5px] font-medium transition-colors duration-200 active:opacity-70 ${
                active ? "text-accent-700 dark:text-accent-200" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={`transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${active ? "-translate-y-px scale-105" : ""}`}
              />
              <span className={`max-w-full truncate px-0.5 ${active ? "font-semibold" : ""}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
