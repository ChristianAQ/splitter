import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useGroups } from "../../hooks/useGroups";
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
      <div className="flex flex-col gap-2 pb-2">
        <button
          onClick={() => setMode("personal")}
          className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-left active:bg-neutral-100 dark:bg-neutral-800/60 dark:active:bg-neutral-800"
        >
          <span className="text-2xl">👤</span>
          <div>
            <p className="font-semibold">Gasto personal</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Solo tuyo, en tu zona privada</p>
          </div>
        </button>

        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setMode(g.id)}
            className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-left active:bg-neutral-100 dark:bg-neutral-800/60 dark:active:bg-neutral-800"
          >
            <span className="text-2xl">{g.icon}</span>
            <div>
              <p className="font-semibold">{g.name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Gasto compartido de grupo</p>
            </div>
          </button>
        ))}

        {groups.length === 0 && (
          <p className="px-1 py-2 text-sm text-neutral-500 dark:text-neutral-400">
            Crea un grupo desde la pestaña Grupos para añadir gastos compartidos.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
