import { Pipette } from "lucide-react";
import { USER_COLOR_PALETTE } from "../../lib/userColors";
import { ensureReadableColor } from "../../lib/color";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

/** The fixed palette stays the fast one-tap path; the last swatch opens the
 * native color picker for anyone who wants something else, with the chosen
 * color nudged back into a readable range (see ensureReadableColor).
 *
 * The `<input type="color">` sits directly on top of the swatch, invisible
 * but at real size — not a `sr-only`/zero-size input triggered by a
 * separate button's `.click()`. iOS Safari won't present the native color
 * sheet for an input with no on-screen frame to anchor it to, which made
 * that approach silently do nothing on an iPhone. */
export function ColorPicker({ value, onChange }: Props) {
  const isCustom = !USER_COLOR_PALETTE.some((c) => c.value === value);

  return (
    <div className="flex flex-wrap gap-2.5">
      {USER_COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={c.name}
          onClick={() => onChange(c.value)}
          className={`h-9 w-9 rounded-full border-2 transition-transform active:scale-90 ${
            value === c.value ? "border-neutral-900 dark:border-white" : "border-transparent"
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
      <div className="relative h-9 w-9">
        <div
          aria-hidden
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
            isCustom ? "border-neutral-900 dark:border-white" : "border-transparent bg-neutral-100 dark:bg-neutral-800"
          }`}
          style={isCustom ? { backgroundColor: value } : undefined}
        >
          <Pipette
            size={15}
            strokeWidth={2.1}
            className={isCustom ? "text-white/90" : "text-neutral-500 dark:text-neutral-400"}
          />
        </div>
        <input
          type="color"
          aria-label="Color personalizado"
          value={isCustom ? value : "#000000"}
          onChange={(e) => onChange(ensureReadableColor(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
