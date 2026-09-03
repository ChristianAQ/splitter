import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, UserPlus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useGroups } from "../../hooks/useGroups";
import { groupIconComponent } from "../../lib/groupIcons";
import { PersonalExpenseSheet } from "./PersonalExpenseSheet";
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
  const [mode, setMode] = useState<"choose" | "personal" | string>("choose");

  function handleClose() {
    setMode("choose");
    onClose();
  }

  if (mode === "personal") {
    return <PersonalExpenseSheet open onClose={handleClose} />;
  }
  if (mode !== "choose") {
    return <GroupExpenseSheetLauncher groupId={mode} onClose={handleClose} />;
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Añadir gasto">
      <div className="flex flex-col gap-5 pb-2">
        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Personal</h2>
          <button
            onClick={() => setMode("personal")}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-accent-100 bg-accent-50/60 p-4 text-left active:bg-accent-50 dark:border-accent-900/40 dark:bg-accent-900/10 dark:active:bg-accent-900/20"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent dark:bg-accent-900/40 dark:text-accent-300">
              <User size={19} strokeWidth={1.8} />
            </span>
            <div>
              <p className="font-semibold">Gasto personal</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Solo tuyo, en tu zona privada</p>
            </div>
          </button>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Grupos</h2>
          {groups.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/grupos?crear=1");
              }}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 p-4 text-left active:bg-neutral-50 dark:border-neutral-700 dark:active:bg-neutral-800/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
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
                    onClick={() => setMode(g.id)}
                    className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-left active:bg-neutral-100 dark:bg-neutral-800/60 dark:active:bg-neutral-800"
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
  );
}
