import { useEffect, useState } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminModal,
  AdminToast,
  AdminToggle,
  StatusPill,
  adminInput,
  adminTextarea,
} from "../../components/admin";

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

  useAdminChrome({
    title: "Retailers",
    actions: (
      <button
        onClick={openCreate}
        className="btn-lux rounded-full px-6 py-3 text-[11px] font-medium label uppercase"
      >
        Add Retailer
      </button>
    ),
    backTo: "/admin/dashboard",
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
        message: "Failed to delete retailer. Make sure you're logged in as admin.",
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {retailers.map((r) => (
          <div key={r.id} className="card glass rounded-2xl p-5 group">
            {r.image_url && (
              <img
                src={r.image_url}
                alt={r.name}
                className="w-full h-56 object-cover rounded-xl mb-5 border border-luxury-line"
              />
            )}

            <div className="space-y-3">
              <div>
                <h3 className="font-serif text-2xl text-white">{r.name}</h3>
                <p className="text-sm text-luxury-mut mt-2">{r.address}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.is_open_24h ? (
                  <StatusPill status="SUCCESS" label="Open 24 Hours" />
                ) : (
                  <StatusPill
                    status="HOURS"
                    label={`${r.opening_time?.slice(0, 5)}–${r.closing_time?.slice(0, 5)}`}
                  />
                )}
                {r.phone && <StatusPill status="PHONE" label={`Tel: ${r.phone}`} />}
              </div>

              {r.map_url && (
                <a
                  href={r.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-luxury-gold2 hover:text-luxury-champagne"
                >
                  View on Google Maps
                </a>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => openEdit(r)}
                  className="ghost rounded-full px-3 py-1.5 text-[11px] label uppercase"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(r)}
                  className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminModal
        open={showForm}
        title={editing ? "Edit Retailer" : "Add Retailer"}
        onClose={() => setShowForm(false)}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-5">
          {apiError && (
            <div className="glass border border-red-500/40 text-red-200 p-4 rounded-lg">
              <p className="font-semibold mb-1">Something went wrong.</p>
              <p className="text-red-100">{apiError}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <AdminField label="Name" required>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Retailer Name"
                className={adminInput}
                required
              />
            </AdminField>

            <AdminField label="Phone">
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                placeholder="+60 ..."
                className={adminInput}
              />
            </AdminField>
          </div>

          <AdminField label="Address" required>
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="Full address"
              className={adminTextarea}
              rows="3"
              required
            />
          </AdminField>

          <div className="grid md:grid-cols-2 gap-5">
            <AdminField label="Opening Time">
              <input
                type="time"
                name="opening_time"
                value={form.is_open_24h ? "" : form.opening_time}
                onChange={onChange}
                disabled={form.is_open_24h}
                className={adminInput}
              />
            </AdminField>

            <AdminField label="Closing Time">
              <input
                type="time"
                name="closing_time"
                value={form.is_open_24h ? "" : form.closing_time}
                onChange={onChange}
                disabled={form.is_open_24h}
                className={adminInput}
              />
            </AdminField>
          </div>

          <AdminToggle
            checked={form.is_open_24h}
            onChange={(checked) => setForm((f) => ({ ...f, is_open_24h: checked }))}
            label="Open 24 Hours"
          />

          <AdminField label="Google Maps URL">
            <input
              name="map_url"
              value={form.map_url}
              onChange={onChange}
              placeholder="https://maps.google.com/..."
              className={adminInput}
            />
          </AdminField>

          <AdminField label="Image">
            <input
              type="file"
              name="image"
              onChange={onChange}
              className={adminInput}
            />
          </AdminField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="ghost rounded-full px-5 py-2 text-[11px] label uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-lux rounded-full px-6 py-2 text-[11px] label uppercase"
            >
              {editing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </AdminModal>

      {confirmDelete && (
        <AdminConfirm
          open
          title="Delete Retailer"
          message={`Are you sure you want to delete "${confirmDelete.name}"?`}
          confirmText="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
