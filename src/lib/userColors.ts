// Quick-pick presets, each already checked against WCAG AA contrast for
// white bold text on top of it (avatars, badges). A custom color is also
// allowed (see ColorPicker) — ensureReadableColor() keeps those in the same
// safe range instead of restricting users to only these ten.
export const USER_COLOR_PALETTE = [
  { value: "#6366F1", name: "Índigo" },
  { value: "#EC4899", name: "Rosa" },
  { value: "#10B981", name: "Verde" },
  { value: "#F59E0B", name: "Ámbar" },
  { value: "#3B82F6", name: "Azul" },
  { value: "#EF4444", name: "Rojo" },
  { value: "#8B5CF6", name: "Violeta" },
  { value: "#14B8A6", name: "Turquesa" },
  { value: "#F97316", name: "Naranja" },
  { value: "#06B6D4", name: "Cian" },
];

export function isValidUserColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}
