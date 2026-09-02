interface Props {
  label: string;
  value: string;
}

/** Small labeled number in a soft rounded tile — used wherever a handful of
 * related figures (total/pagado/pendiente...) are shown side by side. */
export function StatTile({ label, value }: Props) {
  return (
    <div className="rounded-xl bg-neutral-50 py-2.5 text-center dark:bg-neutral-800/60">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 truncate px-1 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
