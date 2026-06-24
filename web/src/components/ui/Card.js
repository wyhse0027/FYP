export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-luxury-gold/15 bg-white/[0.04] backdrop-blur-md shadow-gold ${className}`}
    >
      {children}
    </div>
  );
}
