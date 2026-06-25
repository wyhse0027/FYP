import Spinner from "./Spinner";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold/60 disabled:opacity-70 disabled:cursor-progress";

export default function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}) {
  const variantCls =
    variant === "primary"
      ? "btn-lux px-8 py-3"
      : "px-8 py-3 text-luxury-champagne border border-luxury-gold/40 hover:border-luxury-gold hover:bg-luxury-gold/10";
  return (
    <button
      className={`${BASE} ${variantCls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={16} className="border-luxury-bg/40 border-t-luxury-bg" />}
      {children}
    </button>
  );
}
