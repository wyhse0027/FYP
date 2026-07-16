import React from "react";
import AdminModal from "./AdminModal";

export default function AdminConfirm({
  open,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  const confirmCls =
    tone === "danger"
      ? "border border-red-500/50 text-red-300 hover:bg-red-500/10"
      : "btn-lux";
  return (
    <AdminModal open={open} title={title} onClose={onCancel} size="sm">
      <p className="text-sm text-luxury-mut mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="ghost rounded-full px-5 py-2 text-[11px] label uppercase">
          {cancelText}
        </button>
        <button onClick={onConfirm} className={`rounded-full px-5 py-2 text-[11px] label uppercase ${confirmCls}`}>
          {confirmText}
        </button>
      </div>
    </AdminModal>
  );
}
