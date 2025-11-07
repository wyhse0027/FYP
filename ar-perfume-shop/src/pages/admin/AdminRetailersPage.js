import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";
import {
  IoAddCircleOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoClose,
  IoCheckmarkCircle,
  IoAlertCircle,
} from "react-icons/io5";

// ─────────────────────────────────────────────
// Toast component (for success/error messages)
// ─────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  const color =
    type === "error"
      ? "bg-red-600/90 border-red-400"
      : "bg-green-600/90 border-green-400";

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-white ${color}`}
    >
      {type === "error" ? (
        <IoAlertCircle size={26} />
      ) : (
        <IoCheckmarkCircle size={26} />
      )}
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className="ml-3 opacity-80 hover:opacity-100">
        <IoClose size={20} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Confirm deletion modal
// ─────────────────────────────────────────────
function Confirm({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#10214f] text-white w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        <h3 className="text-2xl font-semibold mb-2">{title}</h3>
        <p className="text-white/80 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    opening_time: "10:00",
    closing_time: "22:00",
    is_open_24h: false,
    phone: "",
    map_url: "",
    image: null,
  });

  useEffect(() => {
    loadRetailers();
  }, []);

  async function loadRetailers() {
    try {
      const res = await http.get("/retailers/");
      setRetailers(res.data);
    } catch (err) {
      console.error("Failed to load retailers:", err);
    }
  }

  function onChange(e) {
    const { name, type, value, checked, files } = e.target;
    if (type === "checkbox") setForm((f) => ({ ...f, [name]: checked }));
    else if (type === "file") setForm((f) => ({ ...f, image: files?.[0] || null }));
    else setForm((f) => ({ ...f, [name]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      address: "",
      opening_time: "10:00",
      closing_time: "22:00",
      is_open_24h: false,
      phone: "",
      map_url: "",
      image: null,
    });
    setApiError("");
    setShowForm(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      name: r.name || "",
      address: r.address || "",
      opening_time: r.opening_time?.slice(0, 5) || "10:00",
      closing_time: r.closing_time?.slice(0, 5) || "22:00",
      is_open_24h: !!r.is_open_24h,
      phone: r.phone || "",
      map_url: r.map_url || "",
      image: null,
    });
    setApiError("");
    setShowForm(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setApiError("");

    const fd = new FormData();
    const payload = { ...form };
    if (payload.opening_time && payload.opening_time.length === 5)
      payload.opening_time = `${payload.opening_time}:00`;
    if (payload.closing_time && payload.closing_time.length === 5)
      payload.closing_time = `${payload.closing_time}:00`;

    Object.entries(payload).forEach(([k, v]) => {
      if (v === null || v === undefined || (k === "image" && !v)) return;
      if (k === "is_open_24h") fd.append(k, v ? "true" : "false");
      else fd.append(k, v);
    });

    try {
      if (editing) {
        await http.put(`/retailers/${editing.id}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setToast({ message: "Retailer updated successfully!", type: "success" });
      } else {
        await http.post(`/retailers/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setToast({ message: "Retailer added successfully!", type: "success" });
      }
      await loadRetailers();
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      console.error("Failed to save retailer:", err?.response?.data || err);
      const serverMsg = err?.response?.data;
      let readable =
        "Something went wrong while saving the retailer. Please check your details and try again.";

      if (serverMsg) {
        if (typeof serverMsg === "string") readable = serverMsg;
        else if (serverMsg.detail) readable = serverMsg.detail;
        else if (serverMsg.non_field_errors?.length)
          readable = serverMsg.non_field_errors.join(", ");
        else if (typeof serverMsg === "object") {
          const firstKey = Object.keys(serverMsg)[0];
          readable = `${firstKey.replace(/_/g, " ")}: ${serverMsg[firstKey]}`;
        }
      }
      setApiError(readable);
      setToast({ message: "Failed to save retailer.", type: "error" });
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    try {
      await http.delete(`/retailers/${confirmDelete.id}/`);
      setToast({ message: "Retailer deleted successfully.", type: "success" });
      setConfirmDelete(null);
      loadRetailers();
    } catch (err) {
      console.error("Failed to delete retailer:", err?.response?.data || err);
      setToast({
        message: "Failed to delete retailer. Make sure you’re logged in as admin.",
        type: "error",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16 py-10">
      <div className="max-w-7xl mx-auto">
        {/* Unified Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-center rounded-full hover:bg-white/10 transition p-2"
            title="Back to Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </Link>

          <h1 className="text-4xl font-bold text-center flex-1">
            Manage Retailers
          </h1>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 px-5 py-3 rounded-xl font-semibold text-lg"
          >
            <IoAddCircleOutline size={28} />
            Add Retailer
          </button>
        </div>

        {/* Retailers Grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {retailers.map((r) => (
            <div
              key={r.id}
              className="bg-white/10 rounded-2xl p-6 shadow-lg relative group hover:scale-[1.01] transition-transform"
            >
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt={r.name}
                  className="w-full h-60 object-cover rounded-xl mb-5"
                />
              )}
              <h3 className="text-2xl font-semibold">{r.name}</h3>
              <p className="text-white/80 mt-2">{r.address}</p>
              <p className="text-white/60 mt-2">
                {r.is_open_24h
                  ? "Open 24 Hours"
                  : `Hours: ${r.opening_time?.slice(0, 5)}–${r.closing_time?.slice(
                      0,
                      5
                    )}`}
              </p>
              {r.phone && <p className="text-white/60 mt-1">Tel: {r.phone}</p>}
              {r.map_url && (
                <a
                  href={r.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline mt-2 inline-block"
                >
                  View on Google Maps →
                </a>
              )}

              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => openEdit(r)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full"
                  title="Edit"
                >
                  <IoCreateOutline size={18} />
                </button>
                <button
                  onClick={() => setConfirmDelete(r)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-full"
                  title="Delete"
                >
                  <IoTrashOutline size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form
            onSubmit={onSubmit}
            className="bg-[#112255] p-8 rounded-2xl w-full max-w-3xl shadow-2xl space-y-5 text-white"
          >
            <h2 className="text-3xl font-bold">
              {editing ? "Edit Retailer" : "Add Retailer"}
            </h2>

            {apiError && (
              <div className="bg-red-600/15 border border-red-600 text-red-200 p-4 rounded-lg">
                <p className="font-semibold mb-1">⚠️ Oops! Something went wrong.</p>
                <p className="text-red-100">{apiError}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <label className="text-sm flex flex-col gap-2">
                <span>Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Retailer Name"
                  className="w-full p-3 text-lg rounded bg-white/10 border border-white/20"
                  required
                />
              </label>

              <label className="text-sm flex flex-col gap-2">
                <span>Phone</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="+60 ..."
                  className="w-full p-3 text-lg rounded bg-white/10 border border-white/20"
                />
              </label>
            </div>

            <label className="text-sm flex flex-col gap-2">
              <span>Address</span>
              <textarea
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Full address"
                className="w-full p-3 text-lg rounded bg-white/10 border border-white/20"
                rows="3"
                required
              />
            </label>

            <div className="grid md:grid-cols-2 gap-6">
              <label className="text-sm flex flex-col gap-2">
                <span>Opening Time</span>
                <input
                  type="time"
                  name="opening_time"
                  value={form.is_open_24h ? "" : form.opening_time}
                  onChange={onChange}
                  disabled={form.is_open_24h}
                  className="p-3 text-lg rounded bg-white/10 border border-white/20"
                />
              </label>

              <label className="text-sm flex flex-col gap-2">
                <span>Closing Time</span>
                <input
                  type="time"
                  name="closing_time"
                  value={form.is_open_24h ? "" : form.closing_time}
                  onChange={onChange}
                  disabled={form.is_open_24h}
                  className="p-3 text-lg rounded bg-white/10 border border-white/20"
                />
              </label>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_open_24h"
                checked={form.is_open_24h}
                onChange={onChange}
              />
              <span className="text-lg">Open 24 Hours</span>
            </label>

            <label className="text-sm flex flex-col gap-2">
              <span>Google Maps URL</span>
              <input
                name="map_url"
                value={form.map_url}
                onChange={onChange}
                placeholder="https://maps.google.com/..."
                className="w-full p-3 text-lg rounded bg-white/10 border border-white/20"
              />
            </label>

            <label className="text-sm flex flex-col gap-2">
              <span>Image</span>
              <input
                type="file"
                name="image"
                onChange={onChange}
                className="w-full text-sm"
              />
            </label>

            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-3 rounded-xl bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 font-semibold"
              >
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <Confirm
          title="Delete Retailer"
          message={`Are you sure you want to delete "${confirmDelete.name}"?`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
