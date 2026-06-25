import React, { useEffect, useRef, useState } from "react";

/**
 * Luxury custom dropdown (replaces native <select> so the open menu can be
 * fully themed). Closed trigger + open glass menu with gold hover + active check.
 *
 * props:
 *  - value, onChange(value)
 *  - options: [{ value, label }]
 *  - leftIcon: optional node rendered before the label
 *  - className: extra classes for the trigger
 *  - menuClassName / optionClassName: extra classes
 *  - align: "left" | "right" (menu alignment)
 */
export default function Dropdown({
  value,
  onChange,
  options = [],
  leftIcon = null,
  className = "",
  menuClassName = "",
  optionClassName = "",
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-3 outline-none ${className}`}
      >
        {leftIcon}
        <span className="flex-1 text-left truncate">{current?.label ?? "Select"}</span>
        <span className={`text-luxury-gold2 transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-40 mt-2 min-w-full glass rounded-2xl p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 transition ${
                  active
                    ? "bg-luxury-gold/15 text-luxury-champagne"
                    : "text-luxury-text hover:bg-white/5 hover:text-white"
                } ${optionClassName}`}
              >
                <span className="truncate">{o.label}</span>
                {active && <span className="text-luxury-gold2 shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
