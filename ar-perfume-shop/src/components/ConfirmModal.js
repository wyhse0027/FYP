// src/components/ConfirmModal.jsx
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";

export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,

  // optional props (won't break other pages)
  loading = false,
  disableConfirm = false,
  closeOnBackdrop = true,
  closeOnEsc = true,
  variant = "primary", // "primary" | "danger"
}) {
  // ESC to close
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEsc, onCancel]);

  if (!open) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-gradient-to-r from-rose-500 to-rose-400 hover:from-rose-400 hover:to-rose-500 text-white shadow-lg shadow-rose-500/20"
      : "bg-gradient-to-r from-luxury-gold to-luxury-gold-light hover:from-luxury-gold-light hover:to-luxury-gold text-slate-900 shadow-lg shadow-luxury-gold/20";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (!closeOnBackdrop) return;
            // only close if user clicks the backdrop, not inside modal
            if (e.target === e.currentTarget) onCancel?.();
          }}
        >
          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden
                       bg-gradient-to-br from-[#0c1a3a] via-[#0b1733] to-[#0c1a3a]
                       border border-luxury-gold/20 shadow-2xl"
          >
            {/* Corner accents */}
            <div className="pointer-events-none absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-luxury-gold/40 rounded-tl-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-luxury-gold/40 rounded-br-2xl" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                {title}
              </h3>
              <button
                onClick={onCancel}
                className="text-white/70 hover:text-white transition"
                aria-label="Close"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-white/80 leading-relaxed text-center">{message}</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20
                           text-white/90 border border-white/10 transition disabled:opacity-50"
              >
                {cancelText}
              </motion.button>

              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={onConfirm}
                disabled={loading || disableConfirm}
                className={`px-5 py-3 rounded-xl font-semibold transition disabled:opacity-50 ${confirmBtnClass}`}
              >
                {loading ? "Please wait..." : confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
