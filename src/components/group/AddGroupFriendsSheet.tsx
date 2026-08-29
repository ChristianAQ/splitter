import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FriendPickerList } from "./FriendPickerList";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFriends } from "../../hooks/useFriends";
import { addFriendsToGroup } from "../../services/groups.service";

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  existingMemberIds: string[];
}

/** Lets the group's admin add more friends directly, after the group
 * already exists — the same picker CreateGroupSheet uses at creation time,
 * filtered down to friends who aren't already members. */
export function AddGroupFriendsSheet({ open, onClose, groupId, existingMemberIds }: Props) {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { friends } = useFriends();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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
    setSelected(new Set());
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

  return (
    <BottomSheet open={open} onClose={handleClose} title="Añadir amigos al grupo">
      <div className="flex flex-col gap-4 pb-2 pt-1">
        {available.length === 0 ? (
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
      </div>
    </BottomSheet>
  );
}
