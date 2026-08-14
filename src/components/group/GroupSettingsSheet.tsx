import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  archiveGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
  renameMember,
} from "../../services/groups.service";
import type { Group, GroupMember } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
}

export function GroupSettingsSheet({ open, onClose, group, members }: Props) {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const isAdmin = group.createdBy === user?.uid;
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<GroupMember | null>(null);
  const [renamingUid, setRenamingUid] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      show("Código copiado", "success");
    } catch {
      show(group.inviteCode);
    }
  }

  async function handleShare() {
    const text = `Únete a mi grupo "${group.name}" en Splitter con el código ${group.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      await handleCopyCode();
    }
  }

  async function handleRegenerate() {
    if (!user) return;
    setBusy(true);
    try {
      await regenerateInviteCode(group.id, user.uid, members.find((m) => m.uid === user.uid)?.name ?? "Alguien");
      show("Código regenerado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo regenerar.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(uid: string) {
    if (!renameValue.trim()) return;
    try {
      await renameMember(group.id, uid, renameValue.trim());
      show("Nombre actualizado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo renombrar.", "error");
    } finally {
      setRenamingUid(null);
    }
  }

  async function handleRemove() {
    if (!confirmRemove || !user) return;
    setBusy(true);
    try {
      await removeMember(group.id, confirmRemove.uid, user.uid);
      show(`${confirmRemove.name} fue eliminado del grupo`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar al miembro.", "error");
    } finally {
      setBusy(false);
      setConfirmRemove(null);
    }
  }

  async function handleLeave() {
    if (!user) return;
    setBusy(true);
    try {
      await leaveGroup(group.id, user.uid, members.find((m) => m.uid === user.uid)?.name ?? "Alguien");
      show("Has salido del grupo", "success");
      onClose();
      navigate("/grupos");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo salir del grupo.", "error");
    } finally {
      setBusy(false);
      setConfirmLeave(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      await archiveGroup(group.id);
      show("Grupo archivado", "success");
      onClose();
      navigate("/grupos");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo archivar.", "error");
    } finally {
      setBusy(false);
      setConfirmArchive(false);
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Ajustes del grupo">
        <div className="flex flex-col gap-6 pb-2 pt-1">
          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Código de invitación</p>
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-800/60">
              <span className="flex-1 text-xl font-bold tracking-[0.2em]">{group.inviteCode}</span>
              <Button size="icon" variant="secondary" onClick={handleCopyCode} aria-label="Copiar código">
                <Copy size={17} strokeWidth={2.1} />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleShare} aria-label="Compartir código">
                <Share2 size={17} strokeWidth={2.1} />
              </Button>
            </div>
            {isAdmin && (
              <button onClick={handleRegenerate} disabled={busy} className="mt-2 text-sm font-medium text-accent">
                Regenerar código
              </button>
            )}
          </section>

          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Participantes</p>
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {members.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.name} color={m.color} size="sm" />
                  {renamingUid === m.uid ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(m.uid)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(m.uid)}
                      className="flex-1 rounded-lg border border-accent bg-white px-2 py-1 text-sm dark:bg-neutral-900"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium">
                      {m.name}
                      {m.uid === group.createdBy && <span className="ml-1.5 text-xs text-neutral-400">Admin</span>}
                      {!m.active && <span className="ml-1.5 text-xs text-neutral-400">(salió)</span>}
                    </span>
                  )}
                  {isAdmin && m.active && renamingUid !== m.uid && (
                    <button
                      onClick={() => {
                        setRenamingUid(m.uid);
                        setRenameValue(m.name);
                      }}
                      className="text-xs font-medium text-accent"
                    >
                      Renombrar
                    </button>
                  )}
                  {isAdmin && m.active && m.uid !== user?.uid && (
                    <button onClick={() => setConfirmRemove(m)} className="text-xs font-medium text-negative">
                      Expulsar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            {isAdmin ? (
              <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
                Archivar grupo
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmLeave(true)}>
                Salir del grupo
              </Button>
            )}
          </section>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmLeave}
        title="¿Salir del grupo?"
        description="Dejarás de ver los gastos nuevos de este grupo. Tu historial de gastos y pagos se conservará."
        confirmLabel="Salir"
        destructive
        onConfirm={handleLeave}
        onCancel={() => setConfirmLeave(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title="¿Archivar grupo?"
        description="El grupo dejará de aparecer activo para todos los miembros. Nada se elimina."
        confirmLabel="Archivar"
        destructive
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title={`¿Expulsar a ${confirmRemove?.name}?`}
        description="Dejará de ver los gastos nuevos del grupo. Su historial se conservará."
        confirmLabel="Expulsar"
        destructive
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}
