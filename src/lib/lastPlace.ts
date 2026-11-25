/**
 * Where the user was, so the app opens there again — the way an iPhone app
 * comes back to the screen you left it on instead of starting over.
 *
 * Kept in localStorage (per device, like any app's restored state). Every
 * access is guarded: storage can be unavailable or throw.
 */

const PREFIX = "splitter:last:";

export function readLast(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeLast(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    // Not remembering is fine.
  }
}

/** The route to reopen on launch: tab pages and the screens under them
 * (a group, Amigos) — never Login or an unknown path. */
export function isRestorableRoute(path: string) {
  return /^\/(gastos|grupos|grupos\/[\w-]+|amigos|estadisticas|perfil)?$/.test(path);
}
