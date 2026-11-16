import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_8px_20px_-10px_rgb(var(--accent-600)/0.9)] disabled:opacity-45 disabled:shadow-none",
  secondary: "well well-press text-neutral-900 dark:text-neutral-50 disabled:opacity-45",
  ghost: "bg-transparent text-accent active:bg-accent/10 disabled:opacity-45",
  danger: "bg-negative text-white disabled:opacity-45",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-11 px-4 text-[15px] rounded-full",
  lg: "h-14 px-6 text-base rounded-full",
  icon: "h-10 w-10 rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, disabled, className = "", children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`pressable inline-flex select-none items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...rest}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
