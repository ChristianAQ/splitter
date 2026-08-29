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

export const DEFAULT_CATEGORY_LIST: Category[] = [
  { id: "casa", label: "Casa", icon: Home },
  { id: "super", label: "Super", icon: ShoppingCart },
  { id: "compras", label: "Compras", icon: ShoppingBag },

  { id: "viajes", label: "Viajes", icon: Plane },
  { id: "transporte", label: "Transporte", icon: Car },
  { id: "multas", label: "Multas", icon: Siren },

  { id: "ocio", label: "Ocio", icon: PartyPopper },
  { id: "fiesta", label: "Fiesta", icon: Music2 },
  { id: "comida", label: "Comida", icon: UtensilsCrossed },

  { id: "barbe", label: "Barbe", icon: Scissors },
  { id: "ahorros", label: "Ahorros", icon: PiggyBank },
  { id: "salida", label: "Salida", icon: HandCoins },

  { id: "suscripciones", label: "Suscripciones", icon: Repeat },
  { id: "mascotas", label: "Mascotas", icon: PawPrint },
  { id: "otros", label: "Otros", icon: Package },
];

// Synthetic category shown only in personal stats, for the "spent across all
// groups this month" slice — deliberately not part of DEFAULT_CATEGORY_LIST
// so it never appears as a selectable option when adding a personal expense.
export const GROUPS_CATEGORY: Category = { id: "grupos", label: "Grupos", icon: Users };

const byId = new Map([...DEFAULT_CATEGORY_LIST, GROUPS_CATEGORY].map((c) => [c.id, c]));

export function categoryById(id: string, custom?: Category[]): Category {
  return byId.get(id) ?? custom?.find((c) => c.id === id) ?? { id, label: "Otros", icon: Package };
}
