import type { CSSProperties, ReactNode } from "react";
import { Pencil, type LucideIcon } from "lucide-react";

/** "Editar" for a detail sheet's header (BottomSheet's `headerAction`):
 * looking at something and changing it are separate steps, and this is the
 * only way from one to the other. */
export function EditAction({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-accent dark:text-accent-300"
    >
      <Pencil size={15} strokeWidth={2.2} />
      Editar
    </button>
  );
}

interface HeroProps {
  icon: LucideIcon;
  /** Tailwind classes or inline colors for the round icon chip. */
  chipClassName?: string;
  chipStyle?: CSSProperties;
  /** Small line above the title: what kind of thing this is. */
  eyebrow?: string;
  title: string;
  amount: string;
  amountClassName?: string;
  /** Small line under the amount ("de 300,00 €", "Tu parte: 12,00 €"...). */
  caption?: ReactNode;
}

/** Top of a detail sheet: what it is, and the one number that matters. */
export function DetailHero({ icon: Icon, chipClassName = "", chipStyle, eyebrow, title, amount, amountClassName = "", caption }: HeroProps) {
  return (
    <div className="flex flex-col items-center pb-1 pt-2 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${chipClassName}`} style={chipStyle}>
        <Icon size={26} strokeWidth={1.8} />
      </span>
      {eyebrow && <p className="mt-3 text-[13px] text-neutral-500 dark:text-neutral-400">{eyebrow}</p>}
      <h3 className={`max-w-full break-words text-lg font-semibold tracking-tight ${eyebrow ? "" : "mt-3"}`}>{title}</h3>
      <p className={`mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums ${amountClassName}`}>{amount}</p>
      {caption && <div className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">{caption}</div>}
    </div>
  );
}

export interface DetailRow {
  label: string;
  /** Rows with an empty value are left out. */
  value: ReactNode;
}

/** Label/value list, the read-only counterpart of a form. */
export function DetailRows({ rows }: { rows: DetailRow[] }) {
  const visible = rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== "" && r.value !== false);
  if (visible.length === 0) return null;
  return (
    <dl className="well divide-y divide-black/[0.06] rounded-[22px] px-4 dark:divide-white/[0.08]">
      {visible.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 py-3">
          <dt className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">{r.label}</dt>
          <dd className="min-w-0 break-words text-right text-sm font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
