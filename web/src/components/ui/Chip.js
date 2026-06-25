export default function Chip({ active = false, children, onClick, className = "" }) {
  const cls = active
    ? "border-luxury-gold/70 bg-luxury-gold/20 text-luxury-champagne"
    : "border-luxury-champagne/25 text-luxury-champagne/90 hover:border-luxury-gold/60 hover:text-white";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full border text-xs uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold/60 ${cls} ${className}`}
    >
      {active && <span data-active-dot className="w-1.5 h-1.5 rounded-full bg-luxury-gold2" />}
      {children}
    </button>
  );
}
