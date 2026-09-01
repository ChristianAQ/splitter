import {
  Home,
  ShoppingCart,
  ShoppingBag,
  Plane,
  Car,
  Siren,
  PartyPopper,
  Music2,
  UtensilsCrossed,
  Scissors,
  PiggyBank,
  HandCoins,
  Repeat,
  PawPrint,
  Package,
  Users,
} from "lucide-react";
import type { Category } from "../types";

// Each category keeps the same color everywhere it's shown (picker, expense
// lists, stats breakdown) so it becomes a recognizable identifier on its own,
// not just a label. Repeats are spaced 10 apart (the picker shows 3 per row),
// so no two categories in the same row ever share a color.
export const DEFAULT_CATEGORY_LIST: Category[] = [
  { id: "casa", label: "Casa", icon: Home, color: "#6366F1" },
  { id: "super", label: "Super", icon: ShoppingCart, color: "#EC4899" },
  { id: "compras", label: "Compras", icon: ShoppingBag, color: "#10B981" },

  { id: "viajes", label: "Viajes", icon: Plane, color: "#F59E0B" },
  { id: "transporte", label: "Transporte", icon: Car, color: "#3B82F6" },
  { id: "multas", label: "Multas", icon: Siren, color: "#EF4444" },

  { id: "ocio", label: "Ocio", icon: PartyPopper, color: "#8B5CF6" },
  { id: "fiesta", label: "Fiesta", icon: Music2, color: "#14B8A6" },
  { id: "comida", label: "Comida", icon: UtensilsCrossed, color: "#F97316" },

  { id: "barbe", label: "Barbe", icon: Scissors, color: "#06B6D4" },
  { id: "ahorros", label: "Ahorros", icon: PiggyBank, color: "#6366F1" },
  { id: "salida", label: "Salida", icon: HandCoins, color: "#EC4899" },

  { id: "suscripciones", label: "Suscripciones", icon: Repeat, color: "#10B981" },
  { id: "mascotas", label: "Mascotas", icon: PawPrint, color: "#F59E0B" },
  { id: "otros", label: "Otros", icon: Package, color: "#64748B" },
];

// Synthetic category shown only in personal stats, for the "spent across all
// groups this month" slice — deliberately not part of DEFAULT_CATEGORY_LIST
// so it never appears as a selectable option when adding a personal expense.
export const GROUPS_CATEGORY: Category = { id: "grupos", label: "Grupos", icon: Users, color: "#0EA5E9" };

const byId = new Map([...DEFAULT_CATEGORY_LIST, GROUPS_CATEGORY].map((c) => [c.id, c]));

export function categoryById(id: string, custom?: Category[]): Category {
  return byId.get(id) ?? custom?.find((c) => c.id === id) ?? { id, label: "Otros", icon: Package, color: "#64748B" };
}
