import { NavLink, useLocation } from "react-router-dom";
import { Home, WalletMinimal, Users, ChartColumn, Settings, type LucideIcon } from "lucide-react";

const ITEMS: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/gastos", label: "Gastos", icon: WalletMinimal, end: false },
  { to: "/grupos", label: "Grupos", icon: Users, end: false },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartColumn, end: false },
  { to: "/perfil", label: "Perfil", icon: Settings, end: false },
];

export function BottomNav() {
  const location = useLocation();
  const activeIndex = Math.max(
    ITEMS.findIndex((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))),
    0
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur-lg dark:border-neutral-800 dark:bg-surface-dark/90"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <div className="relative flex">
        {/* Shared sliding pill: a single element that glides between tabs
         * instead of each tab popping its own background in/out. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden
        >
          <div className="mx-auto mt-2.5 h-8 w-8 rounded-full bg-accent" />
        </div>

        {ITEMS.map((item) => {
          const isGroups = item.to === "/grupos";
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors active:scale-95 ${
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
                  {/* Active page: the shared pill behind provides the accent
                   * background; this span just keeps the icon on top of it.
                   * Grupos when inactive: outlined ring only, so it reads as
                   * "the main feature" without being mistaken for "you are here". */}
                  <span
                    className={
                      isActive
                        ? "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white"
                        : isGroups
                          ? "relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-accent/40 text-accent/80"
                          : "relative z-10 flex h-8 w-8 items-center justify-center"
                    }
                  >
                    <item.icon
                      size={isActive || isGroups ? 20 : 23}
                      strokeWidth={isActive ? 2.3 : 1.8}
                      className={`transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isActive ? "scale-110" : "scale-100"}`}
                    />
                  </span>
                  <span className={isGroups && !isActive ? "font-bold" : undefined}>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
