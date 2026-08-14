import { initials } from "../../lib/format";

interface Props {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = { sm: "h-7 w-7 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };

export function Avatar({ name, color, size = "md" }: Props) {
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
export function UserColorIndicator({ name, color, size = "md" }: Props) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar name={name} color={color} size={size} />
      <span className="truncate font-medium">{name}</span>
    </div>
  );
}
