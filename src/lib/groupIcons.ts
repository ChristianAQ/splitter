import { Wallet, Palmtree, Home, UtensilsCrossed, Plane, PartyPopper, Car, GraduationCap, Trophy, Gift, Users, type LucideIcon } from "lucide-react";

export interface GroupIconOption {
  key: string;
  Icon: LucideIcon;
}

export const GROUP_ICON_OPTIONS: GroupIconOption[] = [
  { key: "wallet", Icon: Wallet },
  { key: "beach", Icon: Palmtree },
  { key: "home", Icon: Home },
  { key: "dining", Icon: UtensilsCrossed },
  { key: "travel", Icon: Plane },
  { key: "party", Icon: PartyPopper },
  { key: "car", Icon: Car },
  { key: "school", Icon: GraduationCap },
  { key: "sports", Icon: Trophy },
  { key: "gift", Icon: Gift },
];

export const DEFAULT_GROUP_ICON_KEY = GROUP_ICON_OPTIONS[0].key;

// Groups created before icons became a fixed key set stored a literal emoji
// in `icon` — map those to the closest new icon so existing groups keep
// looking right instead of falling back to the generic default.
const LEGACY_EMOJI_TO_KEY: Record<string, string> = {
  "💰": "wallet",
  "🏖️": "beach",
  "🏠": "home",
  "🍽️": "dining",
  "✈️": "travel",
  "🎉": "party",
  "🚗": "car",
  "🎓": "school",
  "⚽️": "sports",
  "🎁": "gift",
};

const byKey = new Map(GROUP_ICON_OPTIONS.map((o) => [o.key, o.Icon]));

export function groupIconComponent(icon: string): LucideIcon {
  return byKey.get(icon) ?? byKey.get(LEGACY_EMOJI_TO_KEY[icon]) ?? Users;
}
