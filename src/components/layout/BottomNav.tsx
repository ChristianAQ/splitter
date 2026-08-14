import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Inicio", icon: "🏠", end: true },
  { to: "/gastos", label: "Gastos", icon: "💳", end: false },
  { to: "/grupos", label: "Grupos", icon: "👥", end: false },
  { to: "/estadisticas", label: "Estadísticas", icon: "📊", end: false },
  { to: "/perfil", label: "Perfil", icon: "⚙️", end: false },
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
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-neutral-400 dark:text-neutral-500"
            }`
          }
        >
          <span className="text-[22px] leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
