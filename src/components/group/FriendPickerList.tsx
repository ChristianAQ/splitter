import { Check } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import type { Friend } from "../../types";

interface Props {
  friends: Friend[];
  selected: Set<string>;
  onToggle: (uid: string) => void;
}

/** Checkable friend rows shared by CreateGroupSheet (pick friends while
 * creating a group) and AddGroupFriendsSheet (add more to an existing one). */
export function FriendPickerList({ friends, selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {friends.map((f) => {
        const isSelected = selected.has(f.uid);
        return (
          <button
            key={f.uid}
            type="button"
            onClick={() => onToggle(f.uid)}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left ${
              isSelected ? "border-accent bg-accent-50 dark:bg-accent-900/20" : "border-transparent bg-neutral-50 dark:bg-neutral-800/60"
            }`}
          >
            <Avatar name={f.name} color={f.color} size="sm" />
            <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                isSelected ? "border-accent bg-accent text-white" : "border-neutral-300 text-transparent dark:border-neutral-600"
              }`}
            >
              <Check size={13} strokeWidth={3} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
