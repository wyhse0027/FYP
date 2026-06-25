  import { useNavigate } from "react-router-dom";

  export default function PageHeader({
    title,
    right = null,
    showBack = true,
    className = "",
    onBack,
  }) {
    const navigate = useNavigate();
    const goBack = onBack || (() => navigate(-1));

    return (
      <header
        className={`grid grid-cols-[44px_1fr_44px] items-center gap-2 text-white mb-8 ${className}`}
      >
        {/* Left: Back button (or placeholder) */}
        <div className="flex items-center justify-start">
          {showBack ? (
            <button
              onClick={goBack}
              className="w-11 h-11 grid place-items-center rounded-full border border-luxury-gold/30 text-luxury-gold2 hover:border-luxury-gold/70 hover:bg-luxury-gold/10 transition text-2xl leading-none font-serif"
              aria-label="Go back"
              title="Back"
            >
              ‹
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
        </div>

        {/* Center: Title */}
        {title ? (
          <h1 className="text-center font-bold tracking-wide text-2xl md:text-3xl lg:text-4xl leading-tight whitespace-normal break-words">
            {title}
          </h1>
        ) : (
          <div />
        )}

        {/* Right: Slot (or placeholder to keep centering perfect) */}
        <div className="flex items-center justify-end">
          {right ? <div className="text-2xl md:text-3xl">{right}</div> : <div className="w-11 h-11" />}
        </div>
      </header>
    );
  }
