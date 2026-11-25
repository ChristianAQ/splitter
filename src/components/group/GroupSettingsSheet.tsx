import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  archiveGroup,
  deleteGroup,
  leaveGroup,
  regenerateInviteCode,
  removeMember,
  renameMember,
} from "../../services/groups.service";
import { setGroupArchivedForMe } from "../../services/users.service";
import { formatCurrency } from "../../lib/format";
import type { Group, GroupMember } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  /** Whether the signed-in user has this group in their personal archive. */
  archivedForMe: boolean;
  /** Their net balance in the group, to warn before archiving with debts open. */
  myBalance: number;
}

export function GroupSettingsSheet({ open, onClose, group, members, archivedForMe, myBalance }: Props) {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const isAdmin = group.createdBy === user?.uid;
  const isArchived = Boolean(group.archivedAt);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmArchiveForMe, setConfirmArchiveForMe] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  // Fires from both Enter and blur. Leaving the field empty or unchanged
  // just closes it — it used to either stay stuck in edit mode (empty) or
  // write and toast a no-op rename (unchanged); and since pressing Enter
  // also blurs the input as it unmounts, the mode is cleared up front so
  // the second call finds nothing to do.
  async function handleRename(uid: string) {
    if (renamingUid !== uid) return;
    const next = renameValue.trim();
    const current = members.find((m) => m.uid === uid)?.name;
    setRenamingUid(null);
    if (!next || next === current) return;
    try {
      await renameMember(group.id, uid, next);
      show("Nombre actualizado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo renombrar.", "error");
    }
  }

  async function handleArchiveForMe(archived: boolean) {
    if (!user) return;
    setBusy(true);
    try {
      await setGroupArchivedForMe(user.uid, group.id, archived);
      show(archived ? "Grupo archivado" : "El grupo vuelve a estar activo", "success");
      onClose();
      if (archived) navigate("/grupos");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setBusy(false);
      setConfirmArchiveForMe(false);
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

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteGroup(group.id);
      show("Grupo eliminado", "success");
      onClose();
      navigate("/grupos");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar el grupo.", "error");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Ajustes del grupo">
        <div className="flex flex-col gap-6 pb-2 pt-1">
          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Código de invitación</p>
            <div className="flex items-center gap-2 well rounded-[18px] p-3.5">
              <span className="selectable flex-1 text-xl font-semibold tracking-[0.2em]">{group.inviteCode}</span>
              <Button size="icon" variant="secondary" onClick={handleCopyCode} aria-label="Copiar código">
                <Copy size={17} strokeWidth={2.1} />
              </Button>
            </div>
            {isArchived ? (
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Grupo archivado — ya no se puede usar para unirse.</p>
            ) : (
              <>
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Para invitar a alguien, usa el icono de invitación en la cabecera del grupo.
                </p>
                {isAdmin && (
                  <button onClick={handleRegenerate} disabled={busy} className="mt-2 text-sm font-medium text-accent">
                    Regenerar código
                  </button>
                )}
              </>
            )}
          </section>

          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Participantes</p>
            <ul className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {members.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.name} color={m.color} photoUrl={m.photoUrl} size="sm" />
                  {renamingUid === m.uid ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(m.uid)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(m.uid)}
                      className="flex-1 rounded-lg field !border-accent px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium">
                      {m.name}
                      {m.uid === group.createdBy && <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">Admin</span>}
                      {m.isGhost && <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">Sin cuenta</span>}
                      {!m.active && <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">(salió)</span>}
                    </span>
                  )}
                  {!isArchived && isAdmin && m.active && renamingUid !== m.uid && (
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
                  {!isArchived && isAdmin && m.active && m.uid !== user?.uid && (
                    <button onClick={() => setConfirmRemove(m)} className="text-xs font-medium text-negative">
                      Expulsar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            {!isArchived &&
              (archivedForMe ? (
                <Button variant="secondary" onClick={() => handleArchiveForMe(false)} disabled={busy}>
                  Desarchivar
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setConfirmArchiveForMe(true)}>
                    Archivar para mí
                  </Button>
                  <p className="-mt-0.5 mb-1 px-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Lo quita de tus grupos activos. Los demás lo siguen viendo igual y puedes recuperarlo cuando quieras.
                  </p>
                </>
              ))}
            {isArchived ? (
              isAdmin && (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Eliminar grupo
                </Button>
              )
            ) : isAdmin ? (
              <Button variant="ghost" className="!text-negative" onClick={() => setConfirmArchive(true)}>
                Cerrar el grupo para todos
              </Button>
            ) : (
              <Button variant="ghost" className="!text-negative" onClick={() => setConfirmLeave(true)}>
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
        busy={busy}
        onConfirm={handleLeave}
        onCancel={() => setConfirmLeave(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title="¿Cerrar el grupo para todos?"
        description="Quedará archivado y en solo lectura para todos los miembros, y no se puede reabrir. Si solo quieres dejar de verlo tú, usa «Archivar para mí»."
        confirmLabel="Cerrar grupo"
        destructive
        busy={busy}
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este grupo del todo?"
        description="Se borrarán sus gastos, pagos e historial para siempre. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmArchiveForMe}
        title="¿Archivar este grupo?"
        description={
          Math.abs(myBalance) < 0.005
            ? "Estás al día en este grupo. Pasará a «Archivado» y podrás recuperarlo cuando quieras."
            : myBalance < 0
              ? `Ojo: aún debes ${formatCurrency(-myBalance, group.currency)} en este grupo. Puedes archivarlo igualmente; la deuda seguirá ahí.`
              : `Aún te deben ${formatCurrency(myBalance, group.currency)} en este grupo. Puedes archivarlo igualmente; el saldo seguirá ahí.`
        }
        confirmLabel="Archivar"
        busy={busy}
        onConfirm={() => handleArchiveForMe(true)}
        onCancel={() => setConfirmArchiveForMe(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title={`¿Expulsar a ${confirmRemove?.name}?`}
        description="Dejará de ver los gastos nuevos del grupo. Su historial se conservará."
        confirmLabel="Expulsar"
        destructive
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}
