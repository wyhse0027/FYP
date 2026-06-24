export default function Spinner({ size = 40, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold2 animate-spin-gold ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
