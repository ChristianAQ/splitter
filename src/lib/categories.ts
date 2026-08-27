import type { Category } from "../types";

export const DEFAULT_CATEGORY_LIST: Category[] = [
  { id: "alimentacion", label: "Alimentación", icon: "🛒" },
  { id: "transporte", label: "Transporte", icon: "🚗" },
  { id: "vivienda", label: "Vivienda", icon: "🏠" },
  { id: "ocio", label: "Ocio", icon: "🎉" },
  { id: "comidas", label: "Comidas", icon: "🌮" },
  { id: "fiesta", label: "Fiesta", icon: "🥳" },
  { id: "compras", label: "Compras", icon: "🛍️" },
  { id: "viajes", label: "Viajes", icon: "✈️" },
  { id: "salud", label: "Salud", icon: "💊" },
  { id: "suscripciones", label: "Suscripciones", icon: "🔁" },
  { id: "mascotas", label: "Mascotas", icon: "🐾" },
  { id: "ahorros", label: "Ahorros", icon: "🐷" },
  { id: "multas", label: "Multas", icon: "🚨" },
  { id: "otros", label: "Otros", icon: "📦" },
];

// Synthetic category shown only in personal stats, for the "spent across all
// groups this month" slice — deliberately not part of DEFAULT_CATEGORY_LIST
// so it never appears as a selectable option when adding a personal expense.
export const GROUPS_CATEGORY: Category = { id: "grupos", label: "Grupos", icon: "👥" };

const byId = new Map([...DEFAULT_CATEGORY_LIST, GROUPS_CATEGORY].map((c) => [c.id, c]));

export function categoryById(id: string, custom?: Category[]): Category {
  return (
    byId.get(id) ??
    custom?.find((c) => c.id === id) ?? { id, label: "Otros", icon: "📦" }
  );
}
