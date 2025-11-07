import { IoClose } from "react-icons/io5";

export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]">
      <div className="bg-[#0c1a3a] rounded-2xl w-[380px] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 text-white border-b border-white/10">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onCancel} className="text-2xl hover:text-gray-300">
            <IoClose />
          </button>
        </div>
        <div className="p-5 text-white/90 text-center">{message}</div>
        <div className="p-4 pt-0 flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
