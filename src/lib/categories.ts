import type { Category } from "../types";

export const DEFAULT_CATEGORY_LIST: Category[] = [
  { id: "alimentacion", label: "Alimentación", icon: "🛒" },
  { id: "transporte", label: "Transporte", icon: "🚗" },
  { id: "vivienda", label: "Vivienda", icon: "🏠" },
  { id: "ocio", label: "Ocio", icon: "🎉" },
  { id: "compras", label: "Compras", icon: "🛍️" },
  { id: "viajes", label: "Viajes", icon: "✈️" },
  { id: "salud", label: "Salud", icon: "💊" },
  { id: "suscripciones", label: "Suscripciones", icon: "🔁" },
  { id: "otros", label: "Otros", icon: "📦" },
];

const byId = new Map(DEFAULT_CATEGORY_LIST.map((c) => [c.id, c]));

export function categoryById(id: string, custom?: Category[]): Category {
  return (
    byId.get(id) ??
    custom?.find((c) => c.id === id) ?? { id, label: "Otros", icon: "📦" }
  );
}
