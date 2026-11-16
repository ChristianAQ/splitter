import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, HandCoins, User, UserPlus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useGroups } from "../../hooks/useGroups";
import { groupIconComponent } from "../../lib/groupIcons";
import { PersonalExpenseSheet } from "./PersonalExpenseSheet";
import { DebtSheet } from "../debt/DebtSheet";
import { GroupExpenseSheetLauncher } from "./GroupExpenseSheetLauncher";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Entry point for the FAB: pick "personal" or a group in one tap, then the
 * relevant form opens immediately — keeping "add an expense" to the fewest
 * possible steps from anywhere in the app. */
export function QuickAddSheet({ open, onClose }: Props) {
  const { groups } = useGroups();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "personal" | "debt" | string>("choose");
  // The group whose form was opened last — kept after it closes so that
  // form stays mounted long enough to animate out (see BottomSheet).
  const [groupId, setGroupId] = useState<string | null>(null);
  const isGroupMode = mode !== "choose" && mode !== "personal" && mode !== "debt";

  function handleClose() {
    setMode("choose");
    onClose();
  }

  return (
    <>
    <BottomSheet open={open && mode === "choose"} onClose={onClose} title="Añadir gasto">
      <div className="flex flex-col gap-5 pb-2">
        <div>
          <h2 className="mb-2 px-1 eyebrow">Personal</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMode("personal")}
              className="pressable flex w-full items-center gap-3 rounded-[22px] border border-accent/25 bg-accent/[0.08] p-4 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent dark:bg-accent/25 dark:text-accent-300">
                <User size={19} strokeWidth={1.8} />
              </span>
              <div>
                <p className="font-semibold">Gasto personal</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Solo tuyo, en tu zona privada</p>
              </div>
            </button>
            <button onClick={() => setMode("debt")} className="well well-press pressable flex w-full items-center gap-3 rounded-[22px] p-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
                <HandCoins size={19} strokeWidth={1.8} />
              </span>
              <div>
                <p className="font-semibold">Préstamo o pago pendiente</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Dinero que debes, que te deben o que no quieres olvidar</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-1 eyebrow">Grupos</h2>
          {groups.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/grupos?crear=1");
              }}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 p-4 text-left active:bg-neutral-50 dark:border-neutral-700 dark:active:bg-neutral-800/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full well text-neutral-500 dark:text-neutral-400">
                <UserPlus size={19} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Crea tu primer grupo</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Comparte gastos con amigos o compañeros de piso</p>
              </div>
              <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((g) => {
                const GroupIcon = groupIconComponent(g.icon);
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGroupId(g.id);
                      setMode(g.id);
                    }}
                    className="flex items-center gap-3 well rounded-[18px] p-4 text-left well-press"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${g.color}22`, color: g.color }}
                    >
                      <GroupIcon size={19} strokeWidth={1.8} />
                    </span>
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Gasto compartido de grupo</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
    <PersonalExpenseSheet open={open && mode === "personal"} onClose={handleClose} />
    <DebtSheet open={open && mode === "debt"} onClose={handleClose} />
    {groupId && <GroupExpenseSheetLauncher groupId={groupId} open={open && isGroupMode} onClose={handleClose} />}
    </>
  );
}
