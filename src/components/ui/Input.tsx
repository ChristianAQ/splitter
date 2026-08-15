import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes } from "react";

// Sheets using this field mount as soon as they open (see BottomSheet),
// while the slide-up animation is still running (0.22s, index.css). Native
// `autoFocus` fires the instant the input mounts, so the keyboard opens and
// iOS computes scroll-into-view against a layout that's still animating,
// leaving the sheet scrolled to an arbitrary position instead of the top
// (same root cause fixed in AmountInput.tsx). Delaying the focus past the
// animation avoids it here too.
const AUTOFOCUS_DELAY_MS = 300;

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, id, className = "", autoFocus, ...rest }, forwardedRef) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (!autoFocus) return;
      const timer = setTimeout(() => inputRef.current?.focus(), AUTOFOCUS_DELAY_MS);
      return () => clearTimeout(timer);
    }, [autoFocus]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {label}
          </label>
        )}
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-[16px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-accent focus:ring-2 focus:ring-accent-100 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:ring-accent-900/40 ${
            error ? "border-negative" : "border-neutral-200 dark:border-neutral-700"
          } ${className}`}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-negative">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-sm text-neutral-500 dark:text-neutral-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
