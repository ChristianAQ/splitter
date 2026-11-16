import { useGroupDetail } from "../../hooks/useGroupDetail";
import { GroupExpenseSheet } from "./GroupExpenseSheet";

/** Resolves a group's members/currency before mounting the expense form —
 * used by QuickAddSheet, which only has a groupId when the user picks a
 * group from the FAB (it doesn't already have that group's data loaded). */
export function GroupExpenseSheetLauncher({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const { group, activeMembers, loading } = useGroupDetail(groupId);

  if (loading || !group) return null;

  return (
    <GroupExpenseSheet open={open} onClose={onClose} groupId={groupId} currency={group.currency} members={activeMembers} />
  );
}
