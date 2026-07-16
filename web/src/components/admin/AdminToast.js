import React, { useEffect } from "react";
import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoClose } from "react-icons/io5";

const ACCENT = { success: "#D4AF37", error: "#EF4444", info: "#A9B0BE" };
const ICON = { success: IoCheckmarkCircle, error: IoAlertCircle, info: IoInformationCircle };
const TINT = { success: "text-luxury-gold2", error: "text-red-400", info: "text-luxury-mut" };

export default function AdminToast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const Icon = ICON[type] || ICON.success;
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass fixed bottom-5 right-5 z-40 flex items-center gap-3 px-4 py-3 rounded-xl border-l-2 text-sm text-luxury-text"
      style={{ borderLeftColor: ACCENT[type] || ACCENT.success }}
    >
      <Icon className={`text-xl ${TINT[type] || TINT.success}`} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-luxury-mut hover:text-white" aria-label="Dismiss">
        <IoClose />
      </button>
    </div>
  );
}
