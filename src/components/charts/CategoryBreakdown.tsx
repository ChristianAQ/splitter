import { categoryById } from "../../lib/categories";
import { formatCurrency } from "../../lib/format";
import type { Currency } from "../../types";

interface Slice {
  categoryId: string;
  amount: number;
}

interface Props {
  slices: Slice[];
  currency?: Currency;
}

/** Category breakdown as a horizontal stacked bar + legend — reads faster
 * on a small screen than a pie chart while still being "one glance" clear.
 * Each slice uses the category's own identifying color (same one shown in
 * the category picker and expense lists), not an arbitrary rank color. */
export function CategoryBreakdown({ slices, currency = "EUR" }: Props) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const sorted = [...slices].sort((a, b) => b.amount - a.amount).filter((s) => s.amount > 0);

  if (total <= 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {sorted.map((slice) => (
          <div
            key={slice.categoryId}
            style={{ width: `${(slice.amount / total) * 100}%`, backgroundColor: categoryById(slice.categoryId).color }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((slice) => {
          const category = categoryById(slice.categoryId);
          return (
            <li key={slice.categoryId} className="flex items-center gap-2.5 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <category.icon size={15} strokeWidth={2} className="shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="flex-1 truncate text-neutral-700 dark:text-neutral-300">{category.label}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(slice.amount, currency)}</span>
              <span className="w-10 text-right text-xs text-neutral-400">
                {Math.round((slice.amount / total) * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
