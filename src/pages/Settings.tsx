import { useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { updateUserProfile } from "../services/users.service";
import { signOutUser } from "../services/auth.service";
import { deleteAccount as deleteAccountCascade } from "../services/account.service";
import { USER_COLOR_PALETTE } from "../lib/userColors";
import { CURRENCIES } from "../types";

export function Settings() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { show } = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile || !user) return null;

  async function handleSaveName() {
    if (!name.trim() || name.trim() === profile!.name) return;
    setSavingName(true);
    try {
      await updateUserProfile(user!.uid, { name: name.trim() });
      show("Nombre actualizado", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo guardar.", "error");
    } finally {
      setSavingName(false);
    }
  }

  async function handleColorChange(color: string) {
    try {
      await updateUserProfile(user!.uid, { color });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo cambiar el color.", "error");
    }
  }

  async function handleCurrencyChange(currency: (typeof CURRENCIES)[number]) {
    try {
      await updateUserProfile(user!.uid, { currency });
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo cambiar la moneda.", "error");
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccountCascade(user!.uid, profile!.name);
      show("Cuenta eliminada", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <TopBar title="Perfil" />
      <PageContainer>
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col items-center gap-3 py-6">
            <Avatar name={profile.name} color={profile.color} size="lg" />
            <div className="flex w-full max-w-xs items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSaveName} className="flex-1" />
              {savingName && <span className="text-xs text-neutral-400">Guardando…</span>}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile.email}</p>
          </Card>

          <section>
            <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Color identificativo</p>
            <Card>
              <div className="flex flex-wrap gap-2.5">
                {USER_COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    aria-label={c.name}
                    onClick={() => handleColorChange(c.value)}
                    className={`h-10 w-10 rounded-full border-2 ${
                      profile.color === c.value ? "border-neutral-900 dark:border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-400">Este color se usará en todos tus grupos.</p>
            </Card>
          </section>

          <section>
            <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Moneda</p>
            <Card className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCurrencyChange(c)}
                  className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
                    profile.currency === c
                      ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                      : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </Card>
          </section>

          <section>
            <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Tema</p>
            <Card className="flex gap-2">
              {(
                [
                  ["light", "Claro"],
                  ["dark", "Oscuro"],
                  ["system", "Sistema"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold ${
                    theme === value
                      ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                      : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </Card>
          </section>

          <section>
            <p className="mb-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">Privacidad y seguridad</p>
            <Card className="text-sm text-neutral-500 dark:text-neutral-400">
              Tus gastos personales solo los puedes ver tú. En los grupos, solo quien crea un gasto puede editarlo o
              eliminarlo — esto se comprueba en el servidor, no solo en la app. Consulta el código fuente del proyecto
              para más detalles sobre cómo se protegen tus datos.
            </Card>
          </section>

          <section className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => setConfirmSignOut(true)}>
              Cerrar sesión
            </Button>
            <Button variant="ghost" className="text-negative" onClick={() => setConfirmDelete(true)}>
              Eliminar cuenta
            </Button>
          </section>
        </div>
      </PageContainer>

      <ConfirmDialog
        open={confirmSignOut}
        title="¿Cerrar sesión?"
        confirmLabel="Cerrar sesión"
        onConfirm={() => {
          signOutUser();
          setConfirmSignOut(false);
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar tu cuenta?"
        description="Se borrarán tus gastos personales y tu perfil. Si administras un grupo con más miembros, primero deberás archivarlo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar cuenta"
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      >
        {deleting && <p className="mt-2 text-sm text-neutral-500">Eliminando…</p>}
      </ConfirmDialog>
    </>
  );
}
