export default function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] border border-luxury-gold/30 text-luxury-gold2 ${className}`}
    >
      {children}
    </span>
  );
}
