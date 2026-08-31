import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus, UserRound } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FriendPickerList } from "./FriendPickerList";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFriends } from "../../hooks/useFriends";
import { addFriendsToGroup, addGhostMember } from "../../services/groups.service";

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  existingMemberIds: string[];
}

type Mode = "friends" | "ghost";

/** Lets the group's admin add more members directly, after the group
 * already exists: either a friend (the same picker CreateGroupSheet uses at
 * creation time, filtered down to friends who aren't already members) or
 * someone without a Splitter account — just a name, no invite needed. */
export function AddGroupFriendsSheet({ open, onClose, groupId, existingMemberIds }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { friends } = useFriends();
  const [mode, setMode] = useState<Mode>("friends");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [ghostName, setGhostName] = useState("");
  const [addingGhost, setAddingGhost] = useState(false);

  const available = friends.filter((f) => !existingMemberIds.includes(f.uid));

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function handleClose() {
    setMode("friends");
    setSelected(new Set());
    setGhostName("");
    onClose();
  }

  async function handleAdd() {
    if (!user || !profile || selected.size === 0) return;
    setSaving(true);
    try {
      const toAdd = available.filter((f) => selected.has(f.uid));
      await addFriendsToGroup(groupId, user.uid, profile.name, toAdd);
      show(`${toAdd.length} amigo${toAdd.length > 1 ? "s" : ""} añadido${toAdd.length > 1 ? "s" : ""} al grupo`, "success");
      handleClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo añadir.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGhost() {
    if (!user || !profile || !ghostName.trim()) return;
    setAddingGhost(true);
    try {
      await addGhostMember(groupId, user.uid, profile.name, ghostName);
      show(`${ghostName.trim()} añadido al grupo`, "success");
      setGhostName("");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo añadir.", "error");
    } finally {
      setAddingGhost(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={mode === "friends" ? "Añadir amigos al grupo" : "Añadir sin cuenta"}>
      <div className="flex flex-col gap-4 pb-2 pt-1">
        {mode === "ghost" ? (
          <>
            <button
              onClick={() => setMode("friends")}
              className="flex items-center gap-1.5 self-start text-sm font-medium text-neutral-500 dark:text-neutral-400"
            >
              <ArrowLeft size={15} strokeWidth={2.2} />
              Volver
            </button>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Para alguien que no quiere o no puede usar Splitter — podrás incluirlo en gastos y liquidar con él como con
              cualquier otro miembro; solo que tú gestionas su nombre y sus pagos.
            </p>
            <Input
              label="Nombre"
              placeholder="Ej. Marta"
              value={ghostName}
              onChange={(e) => setGhostName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGhost()}
              autoFocus
            />
            <Button onClick={handleAddGhost} loading={addingGhost} disabled={!ghostName.trim()} size="lg">
              Añadir al grupo
            </Button>
          </>
        ) : available.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Nada que añadir"
            description={
              friends.length === 0 ? "Aún no tienes amigos añadidos." : "Todos tus amigos ya están en este grupo."
            }
            action={
              friends.length === 0 ? (
                <Link to="/amigos" onClick={handleClose} className="text-sm font-semibold text-accent">
                  Ir a Amigos
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <FriendPickerList friends={available} selected={selected} onToggle={toggle} />
            <Button onClick={handleAdd} loading={saving} disabled={selected.size === 0} size="lg">
              Añadir al grupo
            </Button>
          </>
        )}

        {mode === "friends" && (
          <button
            onClick={() => setMode("ghost")}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:active:bg-neutral-800/60"
          >
            <UserRound size={15} strokeWidth={2.1} />
            Añadir a alguien sin cuenta
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
