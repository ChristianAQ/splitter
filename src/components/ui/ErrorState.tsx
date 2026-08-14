import { Button } from "./Button";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="max-w-xs text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Sin conexión — los cambios se sincronizarán al reconectar
    </div>
  );
}
