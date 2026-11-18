import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "../ui/Card";
import { formatCurrency } from "../../lib/format";
import { groupIconComponent } from "../../lib/groupIcons";
import type { Group } from "../../types";

interface Props {
  groups: Group[];
  /** My balance in each group, by id (from useGroupsSummary). */
  balances: Record<string, { balance: number } | undefined>;
  /** Marks rows as archived (dimmed, with a badge). */
  archived?: (group: Group) => boolean;
  /** Something to show at the end of a row, outside its link (an archive button...). */
  trailing?: (group: Group) => ReactNode;
}

/**
 * Groups as rows in one card, the way Inicio and Deudas list things: the
 * group's icon in its color, its name and size, and where I stand in it —
 * "te deben", "debes" or "al día" — on the right.
 */
export function GroupList({ groups, balances, archived, trailing }: Props) {
  return (
    <div className="surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
      {groups.map((g) => (
        <GroupRow key={g.id} group={g} balance={balances[g.id]?.balance} archived={archived?.(g)} trailing={trailing?.(g)} />
      ))}
    </div>
  );
}

function GroupRow({ group, balance, archived, trailing }: { group: Group; balance?: number; archived?: boolean; trailing?: ReactNode }) {
  const Icon = groupIconComponent(group.icon);
  const loaded = balance !== undefined;
  const settled = !loaded || Math.abs(balance) < 0.005;
  const owed = loaded && balance > 0;
  const members = group.memberIds.length;

  return (
    <div className="flex items-center first:rounded-t-[22px] last:rounded-b-[22px]">
      <Link
        to={`/grupos/${group.id}`}
        className={`well-press flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 ${trailing ? "pr-2" : "pr-4"} ${archived ? "opacity-70" : ""}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${group.color}22`, color: group.color }}>
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{group.name}</span>
            {archived && <Badge>Archivado</Badge>}
          </span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {members} {members === 1 ? "persona" : "personas"}
            {group.description ? ` · ${group.description}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {!loaded ? (
            <span className="block h-4 w-14 animate-pulse rounded-full bg-black/[0.07] dark:bg-white/10" aria-hidden />
          ) : settled ? (
            <span className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">Al día</span>
          ) : (
            <>
              <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{owed ? "Te deben" : "Debes"}</span>
              <span className={`block text-[15px] font-semibold tabular-nums ${owed ? "text-positive dark:text-positive-dark" : "text-negative dark:text-negative-dark"}`}>
                {formatCurrency(Math.abs(balance), group.currency)}
              </span>
            </>
          )}
        </span>
        {!trailing && <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />}
      </Link>
      {trailing && <span className="shrink-0 pr-3">{trailing}</span>}
    </div>
  );
}
