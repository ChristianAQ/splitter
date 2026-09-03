function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Highest lightness among USER_COLOR_PALETTE's own presets (Indigo/Violeta,
// ~67%) — every preset is already checked against WCAG AA for white bold
// text, so clamping a custom pick to the same ceiling keeps it inside that
// already-vetted range instead of re-deriving a threshold from scratch.
const MAX_LIGHTNESS = 67;

/** A native color picker lets someone choose anything, including pale
 * shades that wash out the white text laid over it (avatars, badges) —
 * darken those while keeping the hue/saturation they actually picked. */
export function ensureReadableColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (l <= MAX_LIGHTNESS) return hex.toLowerCase();
  return hslToHex(h, s, MAX_LIGHTNESS);
}

/** "#6366F1" -> "99 102 241" — the space-separated triplet format Tailwind's
 * CSS-variable color syntax expects (`rgb(var(--x) / <alpha-value>)`), used
 * to make the app's accent color swappable at runtime (see lib/accentColors.ts). */
export function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}
