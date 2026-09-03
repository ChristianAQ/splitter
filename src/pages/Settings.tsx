import { useRef, useState, type ReactNode } from "react";
import { Camera, Check, Coins, LogOut, Palette, Pencil, ShieldCheck, SunMoon, Sparkles, X } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar";
import { ColorPicker } from "../components/ui/ColorPicker";
import { AccentColorPicker } from "../components/ui/AccentColorPicker";
import { FriendCodeCard } from "../components/ui/FriendCodeCard";
import { ConfirmDialog } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { updateUserProfile } from "../services/users.service";
import { signOutUser } from "../services/auth.service";
import { propagateProfileToGroups } from "../services/profileSync.service";
import { propagateProfileToFriends } from "../services/friends.service";
import { fileToAvatarDataUrl } from "../lib/imageResize";
import { CURRENCIES } from "../types";

export function Settings() {
  const { user, profile } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { show } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!profile || !user) return null;

  async function handlePhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the exact same file again re-trigger onChange
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const photoUrl = await fileToAvatarDataUrl(file);
      await updateUserProfile(user!.uid, { photoUrl });
      await propagateProfileToGroups(user!.uid, { photoUrl });
      await propagateProfileToFriends(user!.uid, { photoUrl });
      show("Foto de perfil actualizada", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo subir la foto.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      await updateUserProfile(user!.uid, { photoUrl: null });
      await propagateProfileToGroups(user!.uid, { photoUrl: null });
      await propagateProfileToFriends(user!.uid, { photoUrl: null });
      show("Foto de perfil eliminada", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "No se pudo eliminar la foto.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  }

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

  function handleCancelName() {
    setName(profile!.name);
    setEditingName(false);
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

  return (
    <>
      <TopBar title="Perfil" />
      <PageContainer>
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <div
              className="h-20"
              style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}99)` }}
              aria-hidden
            />
            <div className="flex flex-col items-center gap-3 px-6 pb-7">
              <div className="relative -mt-12">
                <div className="rounded-full ring-4 ring-white dark:ring-surface-dark-subtle">
                  <Avatar name={profile.name} color={profile.color} photoUrl={profile.photoUrl} size="xl" />
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  aria-label={profile.photoUrl ? "Cambiar foto de perfil" : "Añadir foto de perfil"}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-card ring-2 ring-white active:scale-90 disabled:opacity-60 dark:ring-surface-dark-subtle"
                >
                  <Camera size={15} strokeWidth={2.25} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoPicked}
                  className="hidden"
                />
              </div>
              {profile.photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-1 text-xs font-medium text-neutral-400 active:text-negative disabled:opacity-60"
                >
                  <X size={12} strokeWidth={2.5} />
                  Quitar foto
                </button>
              )}

              {editingName ? (
                <div className="flex w-full max-w-xs items-center gap-1.5">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelName();
                    }}
                    autoFocus
                    className="flex-1 text-center"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    aria-label="Guardar nombre"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive-light text-positive active:scale-90 dark:bg-positive/15 dark:text-positive-dark"
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelName}
                    aria-label="Cancelar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 active:scale-90 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
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
            </div>
          </Card>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Tu código de amigo</h2>
            <FriendCodeCard />
            <p className="mt-1.5 px-1 text-xs text-neutral-400">Compártelo para que alguien te añada como amigo.</p>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Apariencia</h2>
            <Card>
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="pb-4">
                  <SettingLabel icon={Palette}>Color identificativo</SettingLabel>
                  <ColorPicker value={profile.color} onChange={handleColorChange} />
                  <p className="mt-2 text-xs text-neutral-400">Este color se usará en todos tus grupos.</p>
                </div>

                <div className="py-4">
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

                <div className="pt-4">
                  <SettingLabel icon={Sparkles}>Color de la app</SettingLabel>
                  <AccentColorPicker value={accentColor} onChange={setAccentColor} />
                  <p className="mt-2 text-xs text-neutral-400">Sustituye el color por defecto en botones y pestañas.</p>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-neutral-400">General</h2>
            <Card>
              <SettingLabel icon={Coins}>Moneda</SettingLabel>
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <SegmentButton key={c} active={profile.currency === c} onClick={() => handleCurrencyChange(c)}>
                    {c}
                  </SegmentButton>
                ))}
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
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent dark:bg-accent-900/30 dark:text-accent-300">
                  <LogOut size={15} strokeWidth={2.1} />
                </span>
                <span className="text-sm font-semibold">Cerrar sesión</span>
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
    </>
  );
}

function SettingLabel({ icon: Icon, children }: { icon: typeof Palette; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent dark:bg-accent-900/30 dark:text-accent-300">
        <Icon size={14} strokeWidth={2.1} />
      </span>
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
