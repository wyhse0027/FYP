import React, { useEffect, useState, useMemo } from "react";
import http from "../../lib/http";
import { IoAdd, IoTrashOutline, IoRefresh, IoClose } from "react-icons/io5";
import PageHeader from "../../components/PageHeader";

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

  const [categoryOptions, setCategoryOptions] = useState([]); // 🔹 available categories

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

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

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-4 md:px-8 lg:px-12 py-8 relative">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Scent Persona Management" />

        {/* Top bar */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl mb-6 flex flex-wrap gap-3 items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-200 font-semibold">
              {personas.length} persona{personas.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartNew}
              className="bg-pink-500 hover:bg-pink-600 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm"
            >
              <IoAdd /> New Persona
            </button>
            <button
              onClick={fetchPersonas}
              className="bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm"
            >
              <IoRefresh /> Refresh
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 md:grid-cols-[1.5fr,2.5fr]">
          {/* Left: list */}
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 h-[70vh] flex flex-col">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200 mb-2">
              Scent Personas
            </h2>

            {personas.length === 0 && (
              <p className="text-xs text-gray-300">
                No scent personas yet. Create one on the right.
              </p>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 mt-1">
              {personas.map((p) => {
                const active = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-start justify-between gap-2 border ${
                      active
                        ? "bg-pink-500/30 border-pink-400"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                    onClick={() => handleSelectPersona(p)}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-[13px]">
                        {p.persona_name}
                      </span>
                      <span className="text-[10px] text-gray-300 uppercase tracking-wide">
                        {p.category}
                      </span>
                      {p.description && (
                        <span className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                          {p.description}
                        </span>
                      )}
                    </div>
                    <button
                      className="text-red-400 hover:text-red-500 mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 h-[70vh] flex flex-col">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200 mb-3">
              {selectedId && isEditing ? "Edit Scent Persona" : "Create Scent Persona"}
            </h2>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Persona Name</label>
                  <input
                    name="persona_name"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. The Fresh Explorer"
                    value={formData.persona_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Category</label>
                    <select
                        name="category"
                        className="dark-select w-full px-3 py-2 rounded-lg border border-white/10 bg-[#101a3a] text-gray-100 text-sm outline-none focus:ring-2 focus:ring-sky-400 uppercase"
                        value={formData.category}
                        onChange={handleChange}
                    >
                    <option value="">-- Select category --</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">
                    Uses existing Product.category values so quiz + persona mapping stays
                    consistent.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Description / Tagline</label>
                  <textarea
                    name="description"
                    className="w-full min-h-[100px] px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Short story of this persona (mood, lifestyle, scent vibe)..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300">
                    Scent Notes (comma separated)
                  </label>
                  <input
                    name="scent_notes_text"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. citrus, bergamot, marine accord"
                    value={formData.scent_notes_text}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-300">
                    Occasions (comma separated)
                  </label>
                  <input
                    name="occasions_text"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. daily work, date night, weekend brunch"
                    value={formData.occasions_text}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-300">Persona Image</label>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-gray-300"
                    />
                    {selectedPersona?.image_url && !imageFile && (
                      <p className="text-[10px] text-gray-400">
                        Current:{" "}
                        <a
                          href={selectedPersona.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          view image
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-300">Cover Image</label>
                    <input
                      type="file"
                      name="cover_image"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-gray-300"
                    />
                    {selectedPersona?.cover_image_url && !coverImageFile && (
                      <p className="text-[10px] text-gray-400">
                        Current:{" "}
                        <a
                          href={selectedPersona.cover_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          view image
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-500 hover:bg-gray-600"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
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
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center max-w-sm">
            <h3 className="text-lg font-semibold mb-3">
              {confirmAction.message}
            </h3>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <IoClose className="cursor-pointer" onClick={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
