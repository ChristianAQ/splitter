import { useEffect, useState } from "react";
import { Copy, Share2, UserX } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { CardListSkeleton } from "../components/ui/Skeleton";
import { ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useFriends } from "../hooks/useFriends";
import {
  addFriendByCode,
  ensureFriendCode,
  previewFriendCode,
  removeFriend,
  type FriendCodePreview,
} from "../services/friends.service";
import type { Friend } from "../types";

export function Friends() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const { friends, loading } = useFriends();
  const [myCode, setMyCode] = useState<string | undefined>(profile?.friendCode);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<FriendCodePreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Friend | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.friendCode) {
      setMyCode(profile.friendCode);
      return;
    }
    ensureFriendCode(user.uid, profile.friendCode, profile.name, profile.color)
      .then(setMyCode)
      .catch(() => {
        /* silently retried next time the screen opens */
      });
  }, [user, profile]);

  async function handleCopyCode() {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      show("Código copiado", "success");
    } catch {
      show(myCode);
    }
  }

  async function handleShareCode() {
    if (!myCode || !profile) return;
    const text = `Añádeme como amigo en Splitter con mi código: ${myCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mi código de amigo en Splitter", text });
      } catch {
        /* user cancelled — no-op */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      show("Invitación copiada al portapapeles", "success");
    } catch {
      show("No se pudo compartir.", "error");
    }
  }

  function resetAddForm() {
    setCode("");
    setPreview(null);
    setError(null);
  }

  async function handleCheck() {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    setPreview(null);
    try {
      const result = await previewFriendCode(code);
      if (!result) setError("Ese código no es válido.");
      else setPreview(result);
    } catch {
      setError("No se pudo comprobar el código. Inténtalo de nuevo.");
    } finally {
      setChecking(false);
    }
  }

  async function handleAdd() {
    if (!preview || !user || !profile) return;
    setAdding(true);
    try {
      const result = await addFriendByCode(code, user.uid, profile.name, profile.color);
      show(result.alreadyFriend ? `Ya erais amigos con ${result.name}` : `${result.name} añadido a tus amigos`, "success");
      resetAddForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo añadir.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removing || !user) return;
    setBusy(true);
    try {
      await removeFriend(user.uid, removing.uid);
      show(`${removing.name} eliminado de tus amigos`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }

  return (
    <>
      <TopBar title="Amigos" onBack subtitle="Añádelos una vez, invítalos a tus grupos sin código" />
      <PageContainer>
        <div className="flex flex-col gap-5">
          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Tu código</p>
            <Card className="flex items-center gap-2">
              <span className="flex-1 text-xl font-bold tracking-[0.2em]">{myCode ?? "······"}</span>
              <Button size="icon" variant="secondary" onClick={handleCopyCode} aria-label="Copiar código" disabled={!myCode}>
                <Copy size={17} strokeWidth={2.1} />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleShareCode} aria-label="Compartir código" disabled={!myCode}>
                <Share2 size={17} strokeWidth={2.1} />
              </Button>
            </Card>
            <p className="mt-1.5 text-xs text-neutral-400">Compártelo para que alguien te añada como amigo.</p>
          </section>

          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Añadir amigo</p>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Código de amigo"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setPreview(null);
                }}
                autoCapitalize="characters"
              />
              {error && <p className="text-sm font-medium text-negative">{error}</p>}

              {preview && (
                <div className="flex items-center gap-3 rounded-2xl bg-accent-50 p-3.5 dark:bg-accent-900/20">
                  <Avatar name={preview.name} color={preview.color} size="sm" />
                  <p className="text-sm">
                    Vas a añadir a <span className="font-semibold">{preview.name}</span> como amigo
                  </p>
                </div>
              )}

              {preview ? (
                <Button onClick={handleAdd} loading={adding}>
                  Confirmar y añadir
                </Button>
              ) : (
                <Button onClick={handleCheck} loading={checking} disabled={!code.trim()}>
                  Comprobar código
                </Button>
              )}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">Tus amigos</p>
            {loading ? (
              <CardListSkeleton count={2} />
            ) : friends.length === 0 ? (
              <EmptyState icon="🧑‍🤝‍🧑" title="Sin amigos todavía" description="Añade a alguien con su código para poder incluirlo en tus grupos sin invitación." />
            ) : (
              <Card>
                <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                  {friends.map((f) => (
                    <li key={f.uid} className="flex items-center gap-3 py-2.5">
                      <Avatar name={f.name} color={f.color} size="sm" />
                      <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                      <button
                        onClick={() => setRemoving(f)}
                        aria-label={`Eliminar a ${f.name} de tus amigos`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800"
                      >
                        <UserX size={16} strokeWidth={2.1} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>
      </PageContainer>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`¿Eliminar a ${removing?.name}?`}
        description="Dejará de aparecer en tu lista de amigos y no podrás añadirlo directamente a nuevos grupos."
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      >
        {busy && <p className="mt-2 text-sm text-neutral-500">Eliminando…</p>}
      </ConfirmDialog>
    </>
  );
}
