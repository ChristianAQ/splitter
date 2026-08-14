// Translates Firebase error codes into short, human Spanish messages.
// Never surface raw `FirebaseError: permission-denied` strings to the user.

const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Ese correo no parece válido.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
  "auth/user-not-found": "No existe ninguna cuenta con ese correo.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  "auth/network-request-failed": "Sin conexión. Comprueba tu red e inténtalo de nuevo.",
  "auth/popup-closed-by-user": "Se cerró la ventana de inicio de sesión.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión para continuar.",
  "permission-denied": "No tienes permisos para hacer esto.",
  "not-found": "No se ha encontrado el elemento solicitado.",
  unauthenticated: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
  "failed-precondition": "No se puede completar esta acción ahora mismo.",
  "resource-exhausted": "Se ha alcanzado un límite. Inténtalo de nuevo en unos minutos.",
  unavailable: "Sin conexión con el servidor. Se sincronizará cuando vuelvas a tener red.",
  cancelled: "Se canceló la operación.",
};

export class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "AppError";
  }
}

export function toFriendlyError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // The user-facing message is always the short, friendly one below — but
  // the raw Firebase error (e.g. a Firestore "this query requires an
  // index" message, which includes a direct link to create it) is only
  // useful in the console, never in the UI.
  // eslint-disable-next-line no-console
  console.error(error);

  const code = extractCode(error);
  if (code && MESSAGES[code]) return new AppError(MESSAGES[code], code);

  if (!navigator.onLine) {
    return new AppError("Estás sin conexión. Los cambios se guardarán cuando vuelvas a tener red.", "offline");
  }

  return new AppError("Ha ocurrido un error inesperado. Inténtalo de nuevo.", code);
}

function extractCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
