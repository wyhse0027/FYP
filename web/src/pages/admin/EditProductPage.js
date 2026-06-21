import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../lib/http";
import TagsInput from "../../components/TagsInput";

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [newMedia, setNewMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 🔹 Fetch product
  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await http.get(`/admin/products/${id}/`);
        setForm({
          ...res.data,
          tags: Array.isArray(res.data.tags) ? res.data.tags : [],
        });
      } catch (err) {
        console.error("❌ Fetch error:", err);
        alert("Failed to load product");
      }
    }
    fetchProduct();
  }, [id]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.files[0] });

  const handleNewMediaChange = (e) =>
    setNewMedia(Array.from(e.target.files));

  // 🔹 Deletion handlers
  const removePromoImage = async () => {
    if (!window.confirm("Remove promo image?")) return;
    try {
      await http.delete(`/admin/products/${id}/remove-promo/`);
      setForm({ ...form, promo_image: null });
    } catch {
      alert("Failed to remove promo image ❌");
    }
  };

  const removeCardImage = async () => {
    if (!window.confirm("Remove card image?")) return;
    try {
      await http.delete(`/admin/products/${id}/remove-card/`);
      setForm({ ...form, card_image: null });
    } catch {
      alert("Failed to remove card image ❌");
    }
  };

  const removeGalleryMedia = async (mediaId) => {
    if (!window.confirm("Remove this media?")) return;
    try {
      setDeleting(true);
      await http.delete(`/admin/media/${mediaId}/`);
      setForm({
        ...form,
        media_gallery: form.media_gallery.filter((m) => m.id !== mediaId),
      });
    } catch {
      alert("Failed to remove media ❌");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name || "");
      fd.append("category", form.category || "");
      fd.append("price", form.price || "");
      fd.append("stock", form.stock || "");
      fd.append("description", form.description || "");
      fd.append("tags", JSON.stringify(form.tags || []));

      if (form.promo_image instanceof File)
        fd.append("promo_image_file", form.promo_image);
      if (form.card_image instanceof File)
        fd.append("card_image_file", form.card_image);
      newMedia.forEach((f) => fd.append("gallery_files", f));

      await http.patch(`/admin/products/${id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ Product updated!");
      navigate("/admin/products");
    } catch (err) {
      console.error("❌ Update error:", err.response?.data || err.message);
      alert("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (!form) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 py-8">
      <button onClick={() => navigate(-1)} className="mb-6">←</button>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <input name="name" value={form.name || ""} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="category" value={form.category || ""} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="price" type="number" value={form.price || ""} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <input name="stock" type="number" value={form.stock || ""} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />
        <textarea name="description" value={form.description || ""} onChange={handleChange} className="w-full p-2 rounded bg-white/10" />

        <TagsInput tags={form.tags || []} setTags={(tags) => setForm({ ...form, tags })} />

        {/* Promo image */}
        <div>
          <p className="font-semibold mb-1">Promo Image</p>
          {form.promo_image && !(form.promo_image instanceof File) && (
            <div className="relative inline-block mb-2">
              <img src={form.promo_image} alt="Promo" className="w-32 h-32 object-cover rounded-lg" />
              <button onClick={removePromoImage} type="button" className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-xs">✕</button>
            </div>
          )}
          <input type="file" name="promo_image" onChange={handleFileChange} />
        </div>

        {/* Card image */}
        <div>
          <p className="font-semibold mb-1">Card Image</p>
          {form.card_image && !(form.card_image instanceof File) && (
            <div className="relative inline-block mb-2">
              <img src={form.card_image} alt="Card" className="w-32 h-32 object-cover rounded-lg" />
              <button onClick={removeCardImage} type="button" className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-xs">✕</button>
            </div>
          )}
          <input type="file" name="card_image" onChange={handleFileChange} />
        </div>

        {/* Gallery */}
        <div>
          <p className="font-semibold mb-2">Media Gallery</p>
          <div className="flex flex-wrap gap-3">
            {form.media_gallery?.map((m) => (
              <div key={m.id} className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-700">
                {m.type === "video" ? (
                  <video src={m.file} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={m.file} alt="media" className="w-full h-full object-cover" />
                )}
                <button
                  disabled={deleting}
                  onClick={() => removeGalleryMedia(m.id)}
                  type="button"
                  className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input type="file" multiple onChange={handleNewMediaChange} />
        </div>

        <button disabled={loading} type="submit" className="px-6 py-2 bg-yellow-600 rounded hover:bg-yellow-700 font-semibold">
          {loading ? "Saving…" : "Update Product"}
        </button>
      </form>
    </div>
  );
}
