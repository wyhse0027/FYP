import React, { useEffect, useMemo, useRef, useState } from "react";
import http from "../../lib/http";
import { IoRefresh, IoTrashOutline } from "react-icons/io5";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminToast,
  adminInput,
  adminTextarea,
} from "../../components/admin";
import Dropdown from "../../components/ui/Dropdown";

export default function AdminScentPersonaPage() {
  const [personas, setPersonas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [formData, setFormData] = useState({
    persona_name: "",
    category: "",
    description: "",
    scent_notes_text: "",
    occasions_text: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);

  const [categoryOptions, setCategoryOptions] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const actionHandlers = useRef({});

  useEffect(() => {
    fetchPersonas();
    fetchCategories();
  }, []);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function confirm(message, onConfirm) {
    setConfirmAction({ message, onConfirm });
  }

  async function fetchPersonas() {
    try {
      const res = await http.get("admin/scent-personas/");
      const data = res.data || [];
      setPersonas(data);

      if (!selectedId && data.length > 0) {
        const first = data[0];
        hydrateFormFromPersona(first);
        setSelectedId(first.id);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Failed to load scent personas:", err?.response?.data || err);
      showToast("error", "Failed to load scent personas");
    }
  }

  async function fetchCategories() {
    try {
      // uses your AdminCategoryList view: returns list of distinct product categories
      const res = await http.get("admin/categories/");
      setCategoryOptions(res.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err?.response?.data || err);
      showToast("error", "Failed to load categories");
    }
  }

  function hydrateFormFromPersona(p) {
    setFormData({
      persona_name: p.persona_name || "",
      category: p.category || "",
      description: p.description || "",
      scent_notes_text: Array.isArray(p.scent_notes)
        ? p.scent_notes.join(", ")
        : "",
      occasions_text: Array.isArray(p.occasions)
        ? p.occasions.join(", ")
        : "",
    });
    setImageFile(null);
    setCoverImageFile(null);
  }

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedId) || null,
    [personas, selectedId]
  );

  function handleSelectPersona(p) {
    setSelectedId(p.id);
    setIsEditing(true);
    hydrateFormFromPersona(p);
  }

  function handleStartNew() {
    setSelectedId(null);
    setIsEditing(false);
    setFormData({
      persona_name: "",
      category: "",
      description: "",
      scent_notes_text: "",
      occasions_text: "",
    });
    setImageFile(null);
    setCoverImageFile(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e) {
    const { name, files } = e.target;
    const file = files && files[0] ? files[0] : null;
    if (name === "image") setImageFile(file);
    if (name === "cover_image") setCoverImageFile(file);
  }

  function splitToList(text) {
    if (!text || !text.trim()) return [];
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!formData.persona_name.trim() || !formData.category.trim()) {
      showToast("error", "Name and category are required");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("persona_name", formData.persona_name.trim());
      payload.append("category", formData.category.trim());
      payload.append("description", formData.description.trim());

      const scentNotesList = splitToList(formData.scent_notes_text);
      const occasionsList = splitToList(formData.occasions_text);

      if (scentNotesList.length) {
        payload.append("scent_notes", JSON.stringify(scentNotesList));
      }
      if (occasionsList.length) {
        payload.append("occasions", JSON.stringify(occasionsList));
      }

      if (imageFile) {
        payload.append("image", imageFile);
      }
      if (coverImageFile) {
        payload.append("cover_image", coverImageFile);
      }

      if (selectedId && isEditing) {
        await http.patch(`admin/scent-personas/${selectedId}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("success", "Scent persona updated");
      } else {
        const res = await http.post("admin/scent-personas/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSelectedId(res.data.id);
        setIsEditing(true);
        showToast("success", "Scent persona created");
      }

      await fetchPersonas();
    } catch (err) {
      console.error("Scent persona save error:", err?.response?.data || err);
      showToast("error", "Failed to save scent persona");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    confirm("Delete this scent persona?", async () => {
      try {
        await http.delete(`admin/scent-personas/${id}/`);
        if (selectedId === id) {
          handleStartNew();
        }
        await fetchPersonas();
        showToast("success", "Scent persona deleted");
      } catch (err) {
        console.error("Scent persona delete error:", err?.response?.data || err);
        showToast("error", "Failed to delete scent persona");
      }
    });
  }

  actionHandlers.current.handleStartNew = handleStartNew;
  actionHandlers.current.fetchPersonas = fetchPersonas;

  const chromeActions = useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => actionHandlers.current.fetchPersonas()}
          className="ghost rounded-full px-5 py-2.5 text-[11px] label uppercase inline-flex items-center gap-2"
        >
          <IoRefresh />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => actionHandlers.current.handleStartNew()}
          className="btn-lux rounded-full px-6 py-2.5 text-[11px] label uppercase font-medium"
        >
          New Persona
        </button>
      </div>
    ),
    []
  );

  useAdminChrome({
    title: "Scent Personas",
    backTo: "/admin/dashboard",
    actions: chromeActions,
  });

  const categoryDropdownOptions = useMemo(
    () => [
      { value: "", label: "Select category" },
      ...categoryOptions.map((cat) => ({ value: cat, label: cat })),
    ],
    [categoryOptions]
  );

  return (
    <div className="grid lg:grid-cols-[1.3fr_2.7fr] gap-5">
      <div className="glass rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="label uppercase text-[10px] text-luxury-mut">Personas</p>
          <span className="text-[11px] text-luxury-mut">
            {personas.length} total
          </span>
        </div>

        {personas.length === 0 && (
          <p className="text-xs text-luxury-mut">
            No scent personas yet. Create one on the right.
          </p>
        )}

        <div className="space-y-2 overflow-y-auto max-h-[440px] pr-1">
          {personas.map((p) => {
            const active = p.id === selectedId;
            return (
              <div
                key={p.id}
                className={`rounded-xl px-4 py-3 cursor-pointer flex items-start justify-between gap-3 border transition ${
                  active
                    ? "border-luxury-gold/60 bg-luxury-gold/12"
                    : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.04]"
                }`}
                onClick={() => handleSelectPersona(p)}
              >
                <div className="min-w-0">
                  <p className="font-serif text-lg text-white leading-tight">
                    {p.persona_name}
                  </p>
                  <p className={`label uppercase text-[9px] mt-1 ${active ? "text-luxury-gold2" : "text-luxury-mut"}`}>
                    {p.category}
                  </p>
                  {p.description && (
                    <p className="text-xs text-luxury-mut mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-red-300/70 hover:text-red-300 mt-1 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                  aria-label={`Delete ${p.persona_name}`}
                >
                  <IoTrashOutline size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl flex flex-col">
        <div className="px-6 pt-6 pb-4">
          <p className="label uppercase text-[10px] text-luxury-gold/80 mb-1">
            {selectedId && isEditing ? "Editing" : "Creating"}
          </p>
          <h2 className="font-serif text-2xl text-white">
            {selectedId && isEditing ? formData.persona_name || "Scent Persona" : "New Scent Persona"}
          </h2>
        </div>
        <div className="rule mx-6" />

        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <AdminField label="Persona Name" required>
                <input
                  name="persona_name"
                  className={adminInput}
                  placeholder="e.g. The Fresh Explorer"
                  value={formData.persona_name}
                  onChange={handleChange}
                />
              </AdminField>

              <AdminField label="Category" required>
                <Dropdown
                  value={formData.category}
                  onChange={(value) =>
                    handleChange({ target: { name: "category", value } })
                  }
                  options={categoryDropdownOptions}
                  className="fld w-full rounded-lg px-4 py-3 text-sm"
                  align="right"
                />
                <p className="text-[11px] text-luxury-mut mt-1.5">
                  Uses existing Product.category values so quiz + persona mapping stays
                  consistent.
                </p>
              </AdminField>
            </div>

            <AdminField label="Description / Tagline">
              <textarea
                name="description"
                className={adminTextarea}
                rows="3"
                placeholder="Short story of this persona (mood, lifestyle, scent vibe)..."
                value={formData.description}
                onChange={handleChange}
              />
            </AdminField>

            <div className="grid md:grid-cols-2 gap-5">
              <AdminField label="Scent Notes">
                <input
                  name="scent_notes_text"
                  className={adminInput}
                  placeholder="e.g. citrus, bergamot, marine accord"
                  value={formData.scent_notes_text}
                  onChange={handleChange}
                />
                <p className="text-[11px] text-luxury-mut mt-1.5">
                  Comma separated.
                </p>
              </AdminField>

              <AdminField label="Occasions">
                <input
                  name="occasions_text"
                  className={adminInput}
                  placeholder="e.g. daily work, date night, weekend brunch"
                  value={formData.occasions_text}
                  onChange={handleChange}
                />
                <p className="text-[11px] text-luxury-mut mt-1.5">
                  Comma separated.
                </p>
              </AdminField>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <AdminField label="Persona Image">
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={adminInput}
                />
                {selectedPersona?.image_url && !imageFile && (
                  <p className="text-[11px] text-luxury-mut mt-1.5">
                    Current:{" "}
                    <a
                      href={selectedPersona.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-luxury-gold2 hover:text-luxury-champagne"
                    >
                      view image
                    </a>
                  </p>
                )}
              </AdminField>

              <AdminField label="Cover Image">
                <input
                  type="file"
                  name="cover_image"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={adminInput}
                />
                {selectedPersona?.cover_image_url && !coverImageFile && (
                  <p className="text-[11px] text-luxury-mut mt-1.5">
                    Current:{" "}
                    <a
                      href={selectedPersona.cover_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-luxury-gold2 hover:text-luxury-champagne"
                    >
                      view image
                    </a>
                  </p>
                )}
              </AdminField>
            </div>
          </div>

          <div className="glass rounded-b-2xl px-6 py-4 flex justify-end gap-3 border-t border-luxury-gold/15">
            <button
              type="button"
              onClick={handleStartNew}
              className="ghost rounded-full px-5 py-2.5 text-[11px] label uppercase"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-lux rounded-full px-7 py-2.5 text-[11px] label uppercase font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving..."
                : selectedId && isEditing
                ? "Save Changes"
                : "Create Persona"}
            </button>
          </div>
        </form>
      </div>

      {confirmAction && (
        <AdminConfirm
          open
          title="Confirm Action"
          message={confirmAction.message}
          confirmText="Yes"
          cancelText="Cancel"
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {toast && (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
