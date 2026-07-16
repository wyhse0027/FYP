import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";

const SIZES = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

export default function AdminModal({ open, title, onClose, children, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body> so the overlay escapes the admin shell's `z-10` stacking
  // context and can sit above the sticky top nav (z-40) on a top layer (z-50).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`glass w-full ${SIZES[size]} max-h-[85vh] overflow-y-auto rounded-2xl p-6 sm:p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-serif text-xl text-white">{title}</h3>
          <button onClick={onClose} className="text-luxury-mut hover:text-white text-lg" aria-label="Close">
            <IoClose />
          </button>
        </div>
        <div className="rule mb-5" />
        {children}
      </div>
    </div>,
    document.body
  );
}
