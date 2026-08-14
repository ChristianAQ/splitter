import { useState } from "react";
import { signIn, signUp, resetPassword } from "../services/auth.service";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";

export function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show } = useToast();

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
          <div className="mb-3 text-5xl">🎫</div>
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
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />

          {error && <p className="text-sm font-medium text-negative">{error}</p>}

          <Button type="submit" size="lg" loading={loading} className="mt-1">
            {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
        </form>

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
