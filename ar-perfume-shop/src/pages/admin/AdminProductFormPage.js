import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../lib/http";
import TagsInput from "../../components/TagsInput";

/* Simple reusable modal */
function Modal({ show, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#112355] rounded-2xl shadow-xl w-full max-w-md p-6 text-center text-white animate-fadeIn">
        <h2 className="text-xl font-semibold mb-3">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Success / Error popup */
function Toast({ show, message, success = true, onClose }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className={`bg-${success ? "green" : "red"}-600 text-white px-6 py-3 rounded-xl text-center shadow-lg animate-bounceIn`}
      >
        <p className="font-semibold">{message}</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-1 bg-white/20 hover:bg-white/30 rounded"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    tags: [],
  });
  const [newMedia, setNewMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // For modals
  const [modal, setModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: "", success: true });

  /* ---------------- Fetch existing product ---------------- */
  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      try {
        const res = await http.get(`/admin/products/${id}/`);
        setForm({
          ...res.data,
          tags: Array.isArray(res.data.tags) ? res.data.tags : [],
        });
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setToast({ show: true, message: "Failed to load product", success: false });
      }
    }
    fetchProduct();
  }, [id]);

  /* ---------------- Form handlers ---------------- */
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setForm({ ...form, [e.target.name]: e.target.files[0] });
  const handleNewMediaChange = (e) => setNewMedia(Array.from(e.target.files));

  /* ---------------- Delete handlers ---------------- */
  const confirmDelete = (title, message, onConfirm) => setModal({ show: true, title, message, onConfirm });
  const closeModal = () => setModal({ show: false, title: "", message: "", onConfirm: null });

  const removePromoImage = () =>
    confirmDelete("Remove Promo Image", "Are you sure you want to delete the promo image?", async () => {
      closeModal();
      try {
        await http.delete(`/admin/products/${id}/remove-promo/`);
        setForm({ ...form, promo_image: null });
        setToast({ show: true, message: "Promo image removed ✅", success: true });
      } catch {
        setToast({ show: true, message: "Failed to remove promo image ❌", success: false });
      }
    });

  const removeCardImage = () =>
    confirmDelete("Remove Card Image", "Are you sure you want to delete the card image?", async () => {
      closeModal();
      try {
        await http.delete(`/admin/products/${id}/remove-card/`);
        setForm({ ...form, card_image: null });
        setToast({ show: true, message: "Card image removed ✅", success: true });
      } catch {
        setToast({ show: true, message: "Failed to remove card image ❌", success: false });
      }
    });

  const removeGalleryMedia = (mediaId) =>
    confirmDelete("Remove Media", "Are you sure you want to delete this media item?", async () => {
      closeModal();
      try {
        setDeleting(true);
        await http.delete(`/admin/product-media/${mediaId}/`);
        setForm({
          ...form,
          media_gallery: form.media_gallery.filter((m) => m.id !== mediaId),
        });
        setToast({ show: true, message: "Media removed ✅", success: true });
      } catch {
        setToast({ show: true, message: "Failed to remove media ❌", success: false });
      } finally {
        setDeleting(false);
      }
    });

  /* ---------------- Submit ---------------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    confirmDelete("Save Product", "Confirm save changes to this product?", async () => {
      closeModal();
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append("name", form.name || "");
        fd.append("category", form.category || "");
        fd.append("price", form.price || "");
        fd.append("stock", form.stock || "");
        fd.append("description", form.description || "");
        fd.append("tags", JSON.stringify(form.tags || []));
        if (form.promo_image instanceof File) fd.append("promo_image_file", form.promo_image);
        if (form.card_image instanceof File) fd.append("card_image_file", form.card_image);
        newMedia.forEach((f) => fd.append("gallery_files", f));

        if (id) {
          await http.patch(`/admin/products/${id}/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setToast({ show: true, message: "Product updated ✅", success: true });
        } else {
          await http.post(`/admin/products/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setToast({ show: true, message: "Product created ✅", success: true });
        }
        setTimeout(() => navigate("/admin/products"), 800);
      } catch (err) {
        console.error("❌ Submit error:", err.response?.data || err.message);
        setToast({ show: true, message: "Failed to save product ❌", success: false });
      } finally {
        setLoading(false);
      }
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] px-6 py-10 text-white">
      <div className="bg-[#112355] w-full max-w-3xl rounded-2xl shadow-2xl p-8">
        {/* Header Row: back icon + title */}
        <div className="flex items-center justify-center mb-8 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 text-3xl hover:text-yellow-400 transition-transform hover:-translate-x-1"
            aria-label="Go Back"
          >
            ❮
          </button>
          <h1 className="text-2xl font-bold text-center">
            {id ? "Edit Product" : "Add Product"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold">Product Name:</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              placeholder="Enter product name"
              className="w-full p-2 rounded bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Category:</label>
            <input
              name="category"
              value={form.category || ""}
              onChange={handleChange}
              placeholder="Enter category"
              className="w-full p-2 rounded bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Price (RM):</label>
            <input
              name="price"
              type="number"
              value={form.price || ""}
              onChange={handleChange}
              placeholder="Enter price"
              className="w-full p-2 rounded bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Stock Quantity:</label>
            <input
              name="stock"
              type="number"
              value={form.stock || ""}
              onChange={handleChange}
              placeholder="Enter stock quantity"
              className="w-full p-2 rounded bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Description:</label>
            <textarea
              name="description"
              value={form.description || ""}
              onChange={handleChange}
              placeholder="Write product description"
              className="w-full p-2 rounded bg-white/10 h-32 resize-none"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Tags:</label>
            <TagsInput tags={form.tags || []} setTags={(tags) => setForm({ ...form, tags })} />
          </div>

          {/* Promo Image */}
          <div className="mt-4">
            <label className="block mb-1 font-semibold">Promo Image:</label>
            <input type="file" name="promo_image" onChange={handleFileChange} />
            {form.promo_image && !(form.promo_image instanceof File) && (
              <div className="mt-2 relative w-fit">
                <img src={form.promo_image} alt="Promo" className="w-32 h-32 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={removePromoImage}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Card Image */}
          <div className="mt-4">
            <label className="block mb-1 font-semibold">Card Image:</label>
            <input type="file" name="card_image" onChange={handleFileChange} />
            {form.card_image && !(form.card_image instanceof File) && (
              <div className="mt-2 relative w-fit">
                <img src={form.card_image} alt="Card" className="w-32 h-32 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={removeCardImage}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Media Gallery */}
          <div>
            <p className="font-semibold mb-2">Existing Media</p>
            <div className="flex flex-wrap gap-3">
              {form.media_gallery?.map((m) => (
                <div key={m.id} className="relative w-24 h-24 bg-gray-700 rounded-lg overflow-hidden">
                  {m.type === "video" ? (
                    <video src={m.file} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.file} alt="media" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => removeGalleryMedia(m.id)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upload new media */}
          <div className="mt-4">
            <label className="block mb-1 font-semibold">Add New Media:</label>
            <input type="file" multiple onChange={handleNewMediaChange} />
          </div>

          <div className="text-center pt-4">
            <button
              disabled={loading}
              type="submit"
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold"
            >
              {loading ? "Saving…" : id ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <Modal
        show={modal.show}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        success={toast.success}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}
