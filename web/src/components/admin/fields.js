import React from "react";

export const adminInput = "fld w-full rounded-lg px-4 py-3 text-sm";
export const adminTextarea = "fld w-full rounded-lg px-4 py-3 text-sm resize-none";

export function AdminField({ label, htmlFor, required = false, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label uppercase text-[10px] text-luxury-mut block mb-2">
        {label} {required && <span className="text-luxury-gold2">*</span>}
      </label>
      {children}
    </div>
  );
}

export function AdminToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? "bg-luxury-gold" : "bg-white/10"}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </span>
      {label && <span className="text-sm text-luxury-text">{label}</span>}
    </button>
  );
}
