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
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-neutral-400 dark:text-neutral-500"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon size={23} strokeWidth={isActive ? 2.3 : 1.8} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
