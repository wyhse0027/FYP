export default function Input({ icon = null, className = "", ...props }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-luxury-gold2/70">{icon}</span>
      )}
      <input
        className={`w-full h-14 ${icon ? "pl-14" : "pl-5"} pr-5 text-base text-white bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 outline-none focus:border-luxury-gold/60 focus:bg-white/10 transition placeholder:text-white/35 ${className}`}
        {...props}
      />
    </div>
  );
}
