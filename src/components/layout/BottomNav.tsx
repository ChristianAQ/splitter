import { NavLink } from "react-router-dom";
import { Home, WalletMinimal, Users, ChartColumn, Settings, type LucideIcon } from "lucide-react";

const ITEMS: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/gastos", label: "Gastos", icon: WalletMinimal, end: false },
  { to: "/grupos", label: "Grupos", icon: Users, end: false },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartColumn, end: false },
  { to: "/perfil", label: "Perfil", icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white/90 backdrop-blur-lg dark:border-neutral-800 dark:bg-surface-dark/90"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      {ITEMS.map((item) => {
        const isGroups = item.to === "/grupos";
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-accent"
                  : isGroups
                    ? "text-accent/80 dark:text-accent/90"
                    : "text-neutral-400 dark:text-neutral-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active page: solid accent pill — the single, unambiguous "you are here" cue.
                 * Grupos when inactive: outlined ring only, so it reads as "the main feature"
                 * without ever being mistaken for the active-page indicator above. */}
                <span
                  className={
                    isActive
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"
                      : isGroups
                        ? "flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-accent/40 text-accent/80"
                        : "flex h-8 w-8 items-center justify-center"
                  }
                >
                  <item.icon size={isActive || isGroups ? 20 : 23} strokeWidth={isActive ? 2.3 : 1.8} />
                </span>
                <span className={isGroups && !isActive ? "font-bold" : undefined}>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
