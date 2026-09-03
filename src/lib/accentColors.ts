// The app's global accent color (buttons, active tabs, FAB...) is normally
// baked into Tailwind's compiled CSS at build time. To let each user pick
// their own, tailwind.config.ts defines the `accent` colors in terms of CSS
// variables instead of fixed hex — this module supplies the shade ramps
// those variables get set to (see ThemeContext's applyAccentColor).
//
// "Índigo" keeps the app's original hand-tuned ramp byte-for-byte, so
// picking nothing (or picking it back) never changes anyone's UI. The other
// nine reuse Tailwind's own default palette for that hue family — already
// designed as a matched 50-900 ramp, and not coincidentally the same hex
// values as USER_COLOR_PALETTE's presets, so a name picked here looks like
// the same color everywhere else it's used in the app.
export interface AccentColorOption {
  name: string;
  value: string; // the "500"/DEFAULT shade — what the swatch itself shows
  shades: Record<number, string>;
}

export const DEFAULT_ACCENT_COLOR = "#6366F1";

export const ACCENT_COLOR_PALETTE: AccentColorOption[] = [
  {
    name: "Índigo",
    value: "#6366F1",
    shades: {
      50: "#EEF0FF",
      100: "#E0E3FF",
      200: "#C6CAFF",
      300: "#A5A9FF",
      400: "#8285FA",
      500: "#6366F1",
      600: "#4F46E5",
      700: "#4338CA",
      800: "#372FA0",
      900: "#2D2870",
    },
  },
  {
    name: "Rosa",
    value: "#EC4899",
    shades: {
      50: "#FDF2F8",
      100: "#FCE7F3",
      200: "#FBCFE8",
      300: "#F9A8D4",
      400: "#F472B6",
      500: "#EC4899",
      600: "#DB2777",
      700: "#BE185D",
      800: "#9D174D",
      900: "#831843",
    },
  },
  {
    name: "Verde",
    value: "#10B981",
    shades: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
    },
  },
  {
    name: "Ámbar",
    value: "#F59E0B",
    shades: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B",
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },
  },
  {
    name: "Azul",
    value: "#3B82F6",
    shades: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD",
      400: "#60A5FA",
      500: "#3B82F6",
      600: "#2563EB",
      700: "#1D4ED8",
      800: "#1E40AF",
      900: "#1E3A8A",
    },
  },
  {
    name: "Rojo",
    value: "#EF4444",
    shades: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      200: "#FECACA",
      300: "#FCA5A5",
      400: "#F87171",
      500: "#EF4444",
      600: "#DC2626",
      700: "#B91C1C",
      800: "#991B1B",
      900: "#7F1D1D",
    },
  },
  {
    name: "Violeta",
    value: "#8B5CF6",
    shades: {
      50: "#F5F3FF",
      100: "#EDE9FE",
      200: "#DDD6FE",
      300: "#C4B5FD",
      400: "#A78BFA",
      500: "#8B5CF6",
      600: "#7C3AED",
      700: "#6D28D9",
      800: "#5B21B6",
      900: "#4C1D95",
    },
  },
  {
    name: "Turquesa",
    value: "#14B8A6",
    shades: {
      50: "#F0FDFA",
      100: "#CCFBF1",
      200: "#99F6E4",
      300: "#5EEAD4",
      400: "#2DD4BF",
      500: "#14B8A6",
      600: "#0D9488",
      700: "#0F766E",
      800: "#115E59",
      900: "#134E4A",
    },
  },
  {
    name: "Naranja",
    value: "#F97316",
    shades: {
      50: "#FFF7ED",
      100: "#FFEDD5",
      200: "#FED7AA",
      300: "#FDBA74",
      400: "#FB923C",
      500: "#F97316",
      600: "#EA580C",
      700: "#C2410C",
      800: "#9A3412",
      900: "#7C2D12",
    },
  },
  {
    name: "Cian",
    value: "#06B6D4",
    shades: {
      50: "#ECFEFF",
      100: "#CFFAFE",
      200: "#A5F3FC",
      300: "#67E8F9",
      400: "#22D3EE",
      500: "#06B6D4",
      600: "#0891B2",
      700: "#0E7490",
      800: "#155E75",
      900: "#164E63",
    },
  },
];

export function accentShadesByHex(hex: string | undefined): Record<number, string> {
  const match = ACCENT_COLOR_PALETTE.find((c) => c.value.toLowerCase() === hex?.toLowerCase());
  return (match ?? ACCENT_COLOR_PALETTE[0]).shades;
}
