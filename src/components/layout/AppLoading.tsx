import logoIcon from "../../assets/logo-icon.png";

/** Shown while auth/profile resolve on app start — the app's own icon,
 * gently pulsing, instead of a generic spinner. */
export function AppLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-light-subtle dark:bg-surface-dark">
      <img src={logoIcon} alt="Cargando…" width={72} height={72} className="animate-pulse rounded-2xl shadow-card" />
    </div>
  );
}
