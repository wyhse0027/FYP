export default function SectionLabel({ children, className = "" }) {
  return (
    <p className={`uppercase tracking-[0.3em] text-[11px] text-luxury-gold/80 ${className}`}>
      {children}
    </p>
  );
}
