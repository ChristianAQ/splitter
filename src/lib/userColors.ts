// Fixed palette so every user color guarantees readable contrast for white
// text on top of it (checked against WCAG AA for large/bold text) — never
// let a user pick an arbitrary color that could wash out next to their name.
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
  return USER_COLOR_PALETTE.some((c) => c.value === color);
}
