import { ACCENT_COLOR_PALETTE } from "../../lib/accentColors";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

/** A fixed set of app-wide accent colors — unlike ColorPicker (user/group
 * identity colors), this has no custom-color option: each swatch here needs
 * a matching pre-built 50-900 shade ramp (see lib/accentColors.ts), which
 * only exists for these presets. */
export function AccentColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color de la app">
      {ACCENT_COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.name}
          onClick={() => onChange(c.value)}
          className={`h-9 w-9 rounded-full border-2 transition-transform active:scale-90 ${
            value === c.value ? "border-neutral-900 dark:border-white" : "border-transparent"
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  );
}
