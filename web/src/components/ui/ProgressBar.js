export default function ProgressBar({ className = "" }) {
  return (
    <div className={`h-[3px] rounded-full bg-white/5 overflow-hidden ${className}`}>
      <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-gold2 animate-bar" />
    </div>
  );
}
