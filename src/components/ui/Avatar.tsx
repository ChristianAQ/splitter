import { initials } from "../../lib/format";

interface Props {
  name: string;
  color: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

interface IndicatorProps extends Props {
  badge?: string;
}

const SIZE_CLASSES = { sm: "h-7 w-7 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-24 w-24 text-3xl" };

export function Avatar({ name, color, photoUrl, size = "md" }: Props) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]}`} />;
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/** Color swatch + name together, so the user's color is never the only
 * signal (accessibility requirement: never rely on color alone). */
export function UserColorIndicator({ name, color, photoUrl, size = "md", badge }: IndicatorProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar name={name} color={color} photoUrl={photoUrl} size={size} />
      <span className="truncate font-medium">{name}</span>
      {badge && <span className="shrink-0 text-xs font-normal text-neutral-400">{badge}</span>}
    </div>
  );
}
