export default function ARPlaceholder({ height = 420 }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center text-center p-6"
      style={{
        height,
        background:
          "radial-gradient(1200px 480px at 50% -30%, rgba(255,255,255,0.15), rgba(14,165,233,0.15) 35%, rgba(12,26,58,0.9) 36%)"
      }}
    >
      <div>
        <div className="text-white text-lg font-semibold">AR preview coming soon</div>
        <div className="text-white/70 text-sm mt-2">
          We’re preparing the 3D model for this perfume.
        </div>
        <div className="text-white/50 text-xs mt-3">
          Tip: you can still browse images, specs, notes & reviews below.
        </div>
      </div>
    </div>
  );
}
