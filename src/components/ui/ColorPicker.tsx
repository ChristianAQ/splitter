import { useRef } from "react";
import { Pipette } from "lucide-react";
import { USER_COLOR_PALETTE } from "../../lib/userColors";
import { ensureReadableColor } from "../../lib/color";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

/** The fixed palette stays the fast one-tap path; the last swatch opens the
 * native color picker for anyone who wants something else, with the chosen
 * color nudged back into a readable range (see ensureReadableColor). */
export function ColorPicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      <button
        type="button"
        aria-label="Color personalizado"
        onClick={() => inputRef.current?.click()}
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform active:scale-90 ${
          isCustom ? "border-neutral-900 dark:border-white" : "border-transparent bg-neutral-100 dark:bg-neutral-800"
        }`}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        <Pipette
          size={15}
          strokeWidth={2.1}
          className={isCustom ? "text-white/90" : "text-neutral-500 dark:text-neutral-400"}
        />
      </button>
      <input
        ref={inputRef}
        type="color"
        value={isCustom ? value : "#000000"}
        onChange={(e) => onChange(ensureReadableColor(e.target.value))}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
