import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:opacity-90 active:opacity-80 disabled:opacity-40",
  ghost:
    "border border-line text-ink hover:bg-bg-soft active:bg-bg-soft disabled:opacity-40",
  quiet: "text-ink-soft underline-offset-4 hover:underline disabled:opacity-40",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-xl px-6 text-base transition-opacity duration-300 ${styles[variant]} ${className}`}
    />
  );
}
