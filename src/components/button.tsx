import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "destructive" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold " +
  "transition-[transform,background-color,border-color,opacity,box-shadow] duration-150 " +
  "active:scale-[0.97] active:duration-75 " +
  "disabled:pointer-events-none disabled:opacity-60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "motion-reduce:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-[var(--primary-strong)]",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-accent",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110",
  outline:
    "border border-border bg-card text-foreground hover:bg-accent",
  ghost: "text-foreground hover:bg-accent",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-4 text-sm",
  lg: "min-h-14 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    fullWidth = false,
    disabled,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      disabled={isDisabled}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});
