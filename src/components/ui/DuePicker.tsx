import { Input } from "./Input";
import { duePresets } from "../../lib/dueDates";
import { todayISO } from "../../domain/date";

interface Props {
  label: string;
  /** "" = no deadline. */
  value: string;
  onChange: (value: string) => void;
}

/** "When is it due?" — a few one-tap answers (including "whenever") and a
 * date field for anything else. */
export function DuePicker({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {duePresets(todayISO()).map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              value === p.value ? "bg-accent text-white" : "well well-press text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Input type="date" aria-label="Fecha límite" placeholder="O elige un día concreto" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
