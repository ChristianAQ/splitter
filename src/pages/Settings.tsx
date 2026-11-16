import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AtSign,
  Camera,
  Check,
  ChevronRight,
  Coins,
  Info,
  KeyRound,
  Landmark,
  LogOut,
  Palette,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SunMoon,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { PageContainer } from "../components/layout/PageContainer";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar";
import { ColorPicker } from "../components/ui/ColorPicker";
import { AccentColorPicker } from "../components/ui/AccentColorPicker";
import { FriendCodeCard } from "../components/ui/FriendCodeCard";
import { ConfirmDialog } from "../components/ui/Modal";
import { BanksSheet } from "../components/expense/BanksSheet";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useGroups } from "../hooks/useGroups";
import { useFriends } from "../hooks/useFriends";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { saveBanks, updateUserProfile } from "../services/users.service";
import { resetPassword, signOutUser } from "../services/auth.service";
import { propagateProfileToGroups } from "../services/profileSync.service";
import { ensureFriendCode, propagateProfileToFriends } from "../services/friends.service";
import { fileToAvatarDataUrl } from "../lib/imageResize";
import { ACCENT_COLOR_PALETTE } from "../lib/accentColors";
import { CURRENCIES, type Bank, type Currency } from "../types";

type Panel = null | "name" | "photo" | "code" | "identity" | "theme" | "accent" | "currency" | "banks" | "privacy";

const THEME_LABEL = { light: "Claro", dark: "Oscuro", system: "Automático" } as const;
const THEME_HINT = { light: "Siempre claro", dark: "Siempre oscuro", system: "Sigue el ajuste del teléfono" } as const;
const CURRENCY_LABEL: Record<Currency, string> = { EUR: "Euro", USD: "Dólar estadounidense", GBP: "Libra esterlina" };
const CURRENCY_SYMBOL: Record<Currency, string> = { EUR: "€", USD: "$", GBP: "£" };
const MEMBER_SINCE = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

/**
 * Perfil, laid out the way account screens in banking apps are: who you
 * are at the top, then short grouped lists where every row shows its
 * current value and opens one focused sheet to change it. Nothing is
 * edited in place on the page itself.
 */
export function Settings() {
  const { user, profile } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { show } = useToast();
  const { groups } = useGroups();
  const { friends } = useFriends();
  const { items: recurring } = useRecurringExpenses();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Keeps the public preview behind the friend code (name/color/photo)
  // current — it used to ride along with the code card being on the page.
  useEffect(() => {
    if (!user || !profile) return;
    ensureFriendCode(user.uid, profile.name, profile.color, profile.photoUrl).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.name, profile?.color, profile?.photoUrl]);

  const banks: Bank[] = useMemo(() => profile?.banks ?? [], [profile?.banks]);
  const bankUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const r of recurring) if (r.bankId) usage[r.bankId] = (usage[r.bankId] ?? 0) + 1;
    return usage;
  }, [recurring]);

  if (!profile || !user) return null;

  const uid = user.uid;
  const close = () => setPanel(null);
  const hasPassword = user.providerData.some((p) => p.providerId === "password");
  const accentName = ACCENT_COLOR_PALETTE.find((c) => c.value.toLowerCase() === accentColor.toLowerCase())?.name ?? "Personalizado";

  function fail(err: unknown, fallback: string) {
    show(err instanceof Error ? err.message : fallback, "error");
  }

  /** A change to how I appear to others: saved on my profile, then copied
   * to my entry in every group and every friend's list. */
  async function saveIdentity(changes: { name?: string; color?: string; photoUrl?: string | null }, message?: string) {
    await updateUserProfile(uid, changes);
    await propagateProfileToGroups(uid, changes);
    await propagateProfileToFriends(uid, changes);
    if (message) show(message, "success");
  }

  async function handlePhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the exact same file again re-trigger onChange
    if (!file) return;
    close();
    setBusy(true);
    try {
      await saveIdentity({ photoUrl: await fileToAvatarDataUrl(file) }, "Foto de perfil actualizada");
    } catch (err) {
      fail(err, "No se pudo subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePhoto() {
    close();
    setBusy(true);
    try {
      await saveIdentity({ photoUrl: null }, "Foto de perfil eliminada");
    } catch (err) {
      fail(err, "No se pudo eliminar la foto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveName() {
    const next = name.trim();
    if (!next || next === profile!.name) return close();
    setBusy(true);
    try {
      await saveIdentity({ name: next }, "Nombre actualizado");
      close();
    } catch (err) {
      fail(err, "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCurrency(currency: Currency) {
    close();
    if (currency === profile!.currency) return;
    try {
      await updateUserProfile(uid, { currency });
    } catch (err) {
      fail(err, "No se pudo cambiar la moneda.");
    }
  }

  async function handleSaveBanks(next: Bank[]) {
    try {
      await saveBanks(uid, next);
      show("Bancos guardados", "success");
    } catch (err) {
      fail(err, "No se pudieron guardar los bancos.");
      throw err;
    }
  }

  async function handleResetPassword() {
    setBusy(true);
    try {
      await resetPassword(profile!.email);
      show("Te hemos enviado un correo para cambiarla", "success");
    } catch (err) {
      fail(err, "No se pudo enviar el correo.");
    } finally {
      setBusy(false);
      setConfirmPassword(false);
    }
  }

  // An installed app keeps running the copy it has cached until it's
  // closed and reopened. This asks the service worker for the newest one
  // and reloads into it.
  async function handleUpdate() {
    setUpdating(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch {
      /* offline, or no service worker (local development): a plain reload is all there is */
    }
    window.location.reload();
  }

  return (
    <>
      <TopBar title="Perfil" />
      <PageContainer>
        <div className="flex flex-col gap-6">
          {/* ------------------------------------------------ Identity */}
          <header className="flex flex-col items-center pt-1 text-center">
            <div className="relative">
              <div className="rounded-full p-1" style={{ boxShadow: `0 0 0 2px ${profile.color}55` }}>
                <Avatar name={profile.name} color={profile.color} photoUrl={profile.photoUrl} size="xl" />
              </div>
              <button
                type="button"
                onClick={() => (profile.photoUrl ? setPanel("photo") : photoInputRef.current?.click())}
                disabled={busy}
                aria-label={profile.photoUrl ? "Cambiar foto de perfil" : "Añadir foto de perfil"}
                className="pressable absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white ring-[3px] ring-surface-light-subtle disabled:opacity-60 dark:ring-surface-dark"
              >
                <Camera size={16} strokeWidth={2.2} />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoPicked} className="hidden" />
            </div>
            <h2 className="mt-3.5 max-w-full truncate text-[22px] font-semibold tracking-[-0.02em]">{profile.name}</h2>
            <p className="max-w-full truncate text-sm text-neutral-500 dark:text-neutral-400">{profile.email}</p>
            <p className="mt-2 rounded-full bg-black/[0.05] px-3 py-1 text-xs text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300">
              En Splitter desde {MEMBER_SINCE.format(new Date(profile.createdAt))}
            </p>
          </header>

          {/* ------------------------------------------------ At a glance */}
          <div className="surface grid grid-cols-3 divide-x divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
            <Stat to="/grupos" value={groups.length} label={groups.length === 1 ? "Grupo" : "Grupos"} />
            <Stat to="/amigos" value={friends.length} label={friends.length === 1 ? "Amigo" : "Amigos"} />
            <Stat onClick={() => setPanel("banks")} value={banks.length} label={banks.length === 1 ? "Banco" : "Bancos"} />
          </div>

          {/* ------------------------------------------------ Account */}
          <Group title="Cuenta">
            <Row
              icon={User}
              label="Nombre"
              value={profile.name}
              onClick={() => {
                setName(profile.name);
                setPanel("name");
              }}
            />
            <Row icon={AtSign} label="Correo" value={profile.email} />
            <Row icon={QrCode} label="Código de amigo" value="Compartir" onClick={() => setPanel("code")} />
            {hasPassword && <Row icon={KeyRound} label="Cambiar contraseña" onClick={() => setConfirmPassword(true)} />}
          </Group>

          {/* ------------------------------------------------ Money */}
          <Group title="Finanzas">
            <Row
              icon={Coins}
              label="Moneda"
              value={`${CURRENCY_LABEL[profile.currency]} (${CURRENCY_SYMBOL[profile.currency]})`}
              onClick={() => setPanel("currency")}
            />
            <Row
              icon={Landmark}
              label="Bancos"
              value={banks.length === 0 ? "Añadir" : undefined}
              trailing={
                banks.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-1">
                      {banks.slice(0, 4).map((b) => (
                        <span key={b.id} className="h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-neutral-900" style={{ backgroundColor: b.color }} />
                      ))}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{banks.length}</span>
                  </span>
                ) : undefined
              }
              onClick={() => setPanel("banks")}
            />
          </Group>

          {/* ------------------------------------------------ Look */}
          <Group title="Apariencia">
            <Row icon={SunMoon} label="Tema" value={THEME_LABEL[theme]} onClick={() => setPanel("theme")} />
            <Row icon={Sparkles} label="Color de la app" value={accentName} trailing={<Swatch color={accentColor} />} onClick={() => setPanel("accent")} />
            <Row icon={Palette} label="Tu color en los grupos" trailing={<Swatch color={profile.color} />} onClick={() => setPanel("identity")} />
          </Group>

          {/* ------------------------------------------------ About */}
          <Group title="Privacidad y aplicación">
            <Row icon={ShieldCheck} label="Privacidad de tus datos" onClick={() => setPanel("privacy")} />
            <Row
              icon={RefreshCw}
              label="Buscar actualización"
              value={updating ? "Buscando…" : undefined}
              onClick={updating ? undefined : handleUpdate}
              spinning={updating}
            />
            <Row icon={Info} label="Versión" value={__BUILD_ID__} />
          </Group>

          <div className="surface rounded-[22px]">
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="well-press flex w-full items-center justify-center gap-2 rounded-[22px] px-4 py-3.5 text-[15px] font-semibold text-negative dark:text-negative-dark"
            >
              <LogOut size={17} strokeWidth={2.1} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </PageContainer>

      {/* ---------------------------------------------------- Sheets */}
      <BottomSheet
        open={panel === "name"}
        onClose={close}
        title="Tu nombre"
        footer={
          <Button className="w-full" onClick={handleSaveName} loading={busy} disabled={!name.trim()}>
            Guardar
          </Button>
        }
      >
        <div className="flex flex-col gap-3 pb-2 pt-1">
          <Input
            aria-label="Nombre"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSaveName();
            }}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Así te verán en tus grupos y tus amigos.</p>
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "photo"} onClose={close} title="Foto de perfil">
        <div className="flex flex-col gap-2 pb-2 pt-1">
          <ActionRow icon={Camera} label="Elegir otra foto" onClick={() => photoInputRef.current?.click()} />
          <ActionRow icon={Trash2} label="Quitar la foto" destructive onClick={handleRemovePhoto} />
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "code"} onClose={close} title="Tu código de amigo">
        <div className="flex flex-col gap-3 pb-2 pt-1">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Quien lo introduzca en Amigos te tendrá en su lista, y tú a esa persona en la tuya. Después podréis añadiros a grupos sin código.
          </p>
          <FriendCodeCard />
          <Link to="/amigos" onClick={close} className="pressable self-center px-3 py-2 text-sm font-semibold text-accent dark:text-accent-300">
            Ver mis amigos
          </Link>
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "currency"} onClose={close} title="Moneda">
        <div className="flex flex-col gap-3 pb-2 pt-1">
          <OptionList
            options={CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABEL[c], hint: `${c} · ${CURRENCY_SYMBOL[c]}` }))}
            selected={profile.currency}
            onSelect={handleCurrency}
          />
          <p className="px-1 text-xs text-neutral-500 dark:text-neutral-400">
            Se usa para tus gastos personales nuevos. Lo que ya tienes apuntado conserva su moneda, y cada grupo usa la suya.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "theme"} onClose={close} title="Tema">
        <div className="pb-2 pt-1">
          <OptionList
            options={(["system", "light", "dark"] as const).map((t) => ({ value: t, label: THEME_LABEL[t], hint: THEME_HINT[t] }))}
            selected={theme}
            onSelect={(t) => {
              setTheme(t);
              close();
            }}
          />
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "accent"} onClose={close} title="Color de la app">
        <div className="flex flex-col gap-3 pb-2 pt-1">
          <AccentColorPicker value={accentColor} onChange={setAccentColor} />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">El color de botones, pestañas y del fondo de la app.</p>
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "identity"} onClose={close} title="Tu color en los grupos">
        <div className="flex flex-col gap-3 pb-2 pt-1">
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} color={profile.color} photoUrl={profile.photoUrl} size="md" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">El color con el que apareces en saldos, repartos y listas de miembros.</p>
          </div>
          <ColorPicker value={profile.color} onChange={(color) => saveIdentity({ color }).catch((err) => fail(err, "No se pudo cambiar el color."))} />
        </div>
      </BottomSheet>

      <BottomSheet open={panel === "privacy"} onClose={close} title="Privacidad de tus datos">
        <ul className="flex flex-col gap-4 pb-2 pt-1 text-sm text-neutral-600 dark:text-neutral-300">
          <PrivacyPoint title="Lo tuyo es solo tuyo">
            Tus gastos personales, tus gastos fijos, tus deudas y tus bancos solo los puedes ver tú.
          </PrivacyPoint>
          <PrivacyPoint title="Los grupos, solo sus miembros">Nadie de fuera puede ver los gastos ni los saldos de un grupo.</PrivacyPoint>
          <PrivacyPoint title="Cada gasto, de quien lo creó">
            En un grupo, solo quien añade un gasto puede cambiarlo o eliminarlo. Se comprueba en el servidor, no solo en la app.
          </PrivacyPoint>
        </ul>
      </BottomSheet>

      <BanksSheet open={panel === "banks"} onClose={close} banks={banks} usage={bankUsage} onSave={handleSaveBanks} />

      <ConfirmDialog
        open={confirmPassword}
        title="¿Cambiar la contraseña?"
        description={`Te enviaremos un correo a ${profile.email} con un enlace para elegir una nueva.`}
        confirmLabel="Enviar correo"
        busy={busy}
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmPassword(false)}
      />
      <ConfirmDialog
        open={confirmSignOut}
        title="¿Cerrar sesión?"
        description="Tus datos se quedan guardados en tu cuenta."
        confirmLabel="Cerrar sesión"
        destructive
        onConfirm={() => {
          signOutUser();
          setConfirmSignOut(false);
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </>
  );
}

function Stat({ value, label, to, onClick }: { value: number; label: string; to?: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="block text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</span>
      <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
    </>
  );
  const className = "well-press block w-full px-2 py-3.5 text-center first:rounded-l-[22px] last:rounded-r-[22px]";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-2 px-1">{title}</h2>
      <div className="surface divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">{children}</div>
    </section>
  );
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  /** Current setting, shown muted on the right. */
  value?: string;
  /** Anything richer than text for the right-hand side (a color swatch...). */
  trailing?: ReactNode;
  /** Omitted for rows that only display something. */
  onClick?: () => void;
  spinning?: boolean;
}

function Row({ icon: Icon, label, value, trailing, onClick, spinning }: RowProps) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-300">
        <Icon size={16} strokeWidth={2} className={spinning ? "animate-spin" : undefined} />
      </span>
      <span className="shrink-0 text-[15px] font-medium">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {value && <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">{value}</span>}
        {trailing}
      </span>
      {onClick && <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />}
    </>
  );
  const className = "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left first:rounded-t-[22px] last:rounded-b-[22px]";
  return onClick ? (
    <button type="button" onClick={onClick} className={`well-press ${className}`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="h-5 w-5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-white/15" style={{ backgroundColor: color }} aria-hidden />;
}

function ActionRow({ icon: Icon, label, onClick, destructive }: { icon: LucideIcon; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`well well-press pressable flex items-center gap-3 rounded-[18px] p-4 text-left text-[15px] font-medium ${
        destructive ? "text-negative dark:text-negative-dark" : ""
      }`}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </button>
  );
}

/** A short list where exactly one option is the current one. */
function OptionList<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string; hint?: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="well divide-y divide-black/[0.06] rounded-[22px] dark:divide-white/[0.08]">
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(o.value)}
            className="well-press flex w-full items-center gap-3 px-4 py-3 text-left first:rounded-t-[22px] last:rounded-b-[22px]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{o.label}</span>
              {o.hint && <span className="block text-xs text-neutral-500 dark:text-neutral-400">{o.hint}</span>}
            </span>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                active ? "bg-accent text-white" : "border-2 border-neutral-300 dark:border-neutral-600"
              }`}
            >
              {active && <Check size={14} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PrivacyPoint({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-positive/10 text-positive dark:bg-positive/20 dark:text-positive-dark">
        <Check size={14} strokeWidth={3} />
      </span>
      <span>
        <span className="block font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
        {children}
      </span>
    </li>
  );
}
