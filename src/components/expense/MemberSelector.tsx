import { Check } from "lucide-react";
import { UserColorIndicator } from "../ui/Avatar";
import type { GroupMember } from "../../types";

interface Props {
  members: GroupMember[];
  selected: string[];
  onToggle: (uid: string) => void;
}

export function MemberSelector({ members, selected, onToggle }: Props) {
  return (
    <ul className="flex flex-col gap-1">
      {members.map((m) => {
        const checked = selected.includes(m.uid);
        return (
          <li key={m.uid}>
            <button
              type="button"
              onClick={() => onToggle(m.uid)}
              aria-pressed={checked}
              className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              <UserColorIndicator name={m.name} color={m.color} size="sm" />
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-white transition-colors ${
                  checked ? "border-accent bg-accent" : "border-neutral-300 dark:border-neutral-600"
                }`}
                aria-hidden
              >
                {checked && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PayerSelector({ members, value, onChange }: { members: GroupMember[]; value: string; onChange: (uid: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {members.map((m) => {
        const selected = m.uid === value;
        return (
          <button
            key={m.uid}
            type="button"
            onClick={() => onChange(m.uid)}
            aria-pressed={selected}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-medium ${
              selected ? "border-accent bg-accent-50 dark:bg-accent-900/30" : "border-transparent"
            }`}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="max-w-[64px] truncate">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
