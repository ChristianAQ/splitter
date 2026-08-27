import { useState, type ReactNode } from "react";
import { Coins, LogOut, Palette, Pencil, ShieldCheck, SunMoon, Trash2 } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar";
import { ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { updateUserProfile } from "../services/users.service";
import { signOutUser } from "../services/auth.service";
import { deleteAccount as deleteAccountCascade } from "../services/account.service";
import { propagateProfileToGroups } from "../services/profileSync.service";
import { propagateProfileToFriends } from "../services/friends.service";
import { USER_COLOR_PALETTE } from "../lib/userColors";
import { CURRENCIES } from "../types";

export function Settings() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { show } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile || !user) return null;

  async function handleSaveName() {
    setEditingName(false);
    if (!name.trim() || name.trim() === profile!.name) {
      setName(profile!.name);
      return;
    }
    setSavingName(true);
    try {
      await updateUserProfile(user!.uid, { name: name.trim() });
      await propagateProfileToGroups(user!.uid, { name: name.trim() });
      await propagateProfileToFriends(user!.uid, { name: name.trim() });
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
      await propagateProfileToGroups(user!.uid, { color });
      await propagateProfileToFriends(user!.uid, { color });
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
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center gap-3 py-7">
            <Avatar name={profile.name} color={profile.color} size="lg" />

            {editingName ? (
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  autoFocus
                  className="flex-1 text-center"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 rounded-full px-2 py-0.5 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <h1 className="text-lg font-bold">{profile.name}</h1>
                {savingName ? (
                  <span className="text-xs font-normal text-neutral-400">Guardando…</span>
                ) : (
                  <Pencil size={13} strokeWidth={2.25} className="text-neutral-400" />
                )}
              </button>
            )}
            <p className="-mt-2 text-sm text-neutral-500 dark:text-neutral-400">{profile.email}</p>
          </Card>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Preferencias</h2>
            <Card>
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="pb-4">
                  <SettingLabel icon={Palette}>Color identificativo</SettingLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {USER_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        aria-label={c.name}
                        onClick={() => handleColorChange(c.value)}
                        className={`h-9 w-9 rounded-full border-2 transition-transform active:scale-90 ${
                          profile.color === c.value ? "border-neutral-900 dark:border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">Este color se usará en todos tus grupos.</p>
                </div>

                <div className="py-4">
                  <SettingLabel icon={Coins}>Moneda</SettingLabel>
                  <div className="flex gap-2">
                    {CURRENCIES.map((c) => (
                      <SegmentButton key={c} active={profile.currency === c} onClick={() => handleCurrencyChange(c)}>
                        {c}
                      </SegmentButton>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <SettingLabel icon={SunMoon}>Tema</SettingLabel>
                  <div className="flex gap-2">
                    {(
                      [
                        ["light", "Claro"],
                        ["dark", "Oscuro"],
                        ["system", "Sistema"],
                      ] as const
                    ).map(([value, label]) => (
                      <SegmentButton key={value} active={theme === value} onClick={() => setTheme(value)}>
                        {label}
                      </SegmentButton>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Privacidad</h2>
            <Card className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive-light text-positive dark:bg-positive/15 dark:text-positive-dark">
                <ShieldCheck size={18} strokeWidth={2.1} />
              </span>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Tus gastos personales solo los puedes ver tú. En los grupos, solo quien crea un gasto puede editarlo o
                eliminarlo — esto se comprueba en el servidor, no solo en la app.
              </p>
            </Card>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Cuenta</h2>
            <Card className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              <button
                onClick={() => setConfirmSignOut(true)}
                className="flex items-center gap-3 p-4 text-left active:bg-neutral-50 dark:active:bg-neutral-800/60"
              >
                <LogOut size={18} strokeWidth={2.1} className="text-neutral-400" />
                <span className="text-sm font-semibold">Cerrar sesión</span>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-3 p-4 text-left text-negative active:bg-negative-light dark:active:bg-negative/10"
              >
                <Trash2 size={18} strokeWidth={2.1} />
                <span className="text-sm font-semibold">Eliminar cuenta</span>
              </button>
            </Card>
          </section>

          <p className="pb-2 text-center text-xs text-neutral-400">Splitter</p>
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

function SettingLabel({ icon: Icon, children }: { icon: typeof Palette; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">
      <Icon size={15} strokeWidth={2.1} className="text-neutral-400" />
      {children}
    </p>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
          : "border-neutral-200 text-neutral-500 dark:border-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
