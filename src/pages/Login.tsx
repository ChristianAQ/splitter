import { useEffect, useState } from "react";
import { validatePassword, type PasswordValidationStatus } from "firebase/auth";
import { Check } from "lucide-react";
import { signIn, signUp, resetPassword, signInWithGoogle } from "../services/auth.service";
import { auth } from "../lib/firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import logoIcon from "../assets/logo-icon.png";

export function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<PasswordValidationStatus | null>(null);
  const { show } = useToast();

  // Reflects whatever password policy is actually configured in the
  // Firebase console (min/max length, upper/lowercase, digits...) instead
  // of hardcoding it here — validatePassword fetches it once and caches it,
  // so this is cheap on every keystroke after the first call.
  useEffect(() => {
    if (mode !== "signup" || !password) {
      setPasswordStatus(null);
      return;
    }
    let cancelled = false;
    validatePassword(auth, password).then((status) => {
      if (!cancelled) setPasswordStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, password]);

  const passwordInvalid = mode === "signup" && password.length > 0 && passwordStatus !== null && !passwordStatus.isValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Escribe tu correo primero para poder enviarte el enlace.");
      return;
    }
    try {
      await resetPassword(email);
      show("Te hemos enviado un correo para restablecer tu contraseña.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col justify-center px-6 py-10"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={logoIcon} alt="Splitter" width={80} height={80} className="mx-auto mb-3 rounded-2xl shadow-card" />
          <h1 className="text-2xl font-bold tracking-tight">Splitter</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Tus gastos personales y los de tus grupos, en un solo sitio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === "signup" && (
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          )}
          <Input
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <div>
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              maxLength={mode === "signup" ? 20 : undefined}
              required
            />
            {mode === "signup" && passwordStatus && <PasswordRequirements status={passwordStatus} />}
          </div>

          {error && <p className="text-sm font-medium text-negative">{error}</p>}

          <Button type="submit" size="lg" loading={loading} disabled={passwordInvalid} className="mt-1">
            {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          <span className="text-xs font-medium text-neutral-400">o</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={googleLoading}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-2.5"
        >
          <GoogleIcon />
          Continuar con Google
        </Button>

        {mode === "signin" && (
          <button onClick={handleForgotPassword} className="mt-3 w-full text-center text-sm text-accent">
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="mt-6 w-full text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          {mode === "signup" ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <span className="font-semibold text-accent">{mode === "signup" ? "Inicia sesión" : "Crea una"}</span>
        </button>
      </div>
    </div>
  );
}

function PasswordRequirements({ status }: { status: PasswordValidationStatus }) {
  const requirements = (
    [
      [status.meetsMinPasswordLength, "Al menos 6 caracteres"],
      [status.meetsMaxPasswordLength, "Máximo 20 caracteres"],
      [status.containsLowercaseLetter, "Una letra minúscula"],
      [status.containsUppercaseLetter, "Una letra mayúscula"],
      [status.containsNumericCharacter, "Un número"],
      [status.containsNonAlphanumericCharacter, "Un símbolo"],
    ] as [boolean | undefined, string][]
  ).filter(([met]) => met !== undefined);

  if (requirements.length === 0) return null;

  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {requirements.map(([met, label]) => (
        <li
          key={label}
          className={`flex items-center gap-1.5 text-xs ${met ? "text-positive" : "text-neutral-400 dark:text-neutral-500"}`}
        >
          <Check size={13} strokeWidth={3} className={met ? "opacity-100" : "opacity-30"} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.87 2.68-6.61z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
