import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../lib/http";
import TagsInput from "../../components/TagsInput";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminToast,
  adminInput,
  adminTextarea,
} from "../../components/admin";
import Dropdown from "../../components/ui/Dropdown";

const TARGET_OPTIONS = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "UNISEX", label: "Unisex" },
];

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
    target: "UNISEX",
    promo_image: null,
    card_image: null,
    media_gallery: [],
  });

  const [newMedia, setNewMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    success: true,
  });

  useAdminChrome({
    title: id ? "Edit Product" : "Add Product",
    backTo: -1,
    actions: null,
  });

  /* ---------------- Load existing product when editing ---------------- */
  useEffect(() => {
    if (!id) return;

    async function fetchProduct() {
      try {
        const res = await http.get(`/admin/products/${id}/`);
        setForm({
          ...res.data,
          tags: Array.isArray(res.data.tags) ? res.data.tags : [],
          target: res.data.target || "UNISEX",
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setToast({
          show: true,
          message: "Failed to load product",
          success: false,
        });
      }
    }

    fetchProduct();
  }, [id]);

  /* ---------------- Helpers ---------------- */
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));

  const handleNewMediaChange = (e) =>
    setNewMedia(Array.from(e.target.files || []));

  const openModal = (title, message, onConfirm) =>
    setModal({ show: true, title, message, onConfirm });

  const closeModal = () =>
    setModal({ show: false, title: "", message: "", onConfirm: null });

  const showToastNow = (message, success = true) =>
    setToast({ show: true, message, success });

  /* ---------------- Delete actions ---------------- */
  const removePromoImage = () =>
    openModal(
      "Remove Promo Image",
      "Are you sure you want to delete the promo image?",
      async () => {
        closeModal();
        try {
          await http.delete(`/admin/products/${id}/remove-promo/`);
          setForm((prev) => ({ ...prev, promo_image: null }));
          showToastNow("Promo image removed", true);
        } catch {
          showToastNow("Failed to remove promo image", false);
        }
      }
    );

  const removeCardImage = () =>
    openModal(
      "Remove Card Image",
      "Are you sure you want to delete the card image?",
      async () => {
        closeModal();
        try {
          await http.delete(`/admin/products/${id}/remove-card/`);
          setForm((prev) => ({ ...prev, card_image: null }));
          showToastNow("Card image removed", true);
        } catch {
          showToastNow("Failed to remove card image", false);
        }
      }
    );

  const removeGalleryMedia = (mediaId) =>
    openModal(
      "Remove Media",
      "Are you sure you want to delete this media item?",
      async () => {
        closeModal();
        try {
          setDeleting(true);
          await http.delete(`/admin/product-media/${mediaId}/`);
          setForm((prev) => ({
            ...prev,
            media_gallery: (prev.media_gallery || []).filter(
              (m) => m.id !== mediaId
            ),
          }));
          showToastNow("Media removed", true);
        } catch {
          showToastNow("Failed to remove media", false);
        } finally {
          setDeleting(false);
        }
      }
    );

  /* ---------------- Submit ---------------- */
  const handleSubmit = (e) => {
    e.preventDefault();

    openModal(
      id ? "Save Product" : "Create Product",
      id
        ? "Confirm save changes to this product?"
        : "Create this new product?",
      async () => {
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
          fd.append("target", form.target || "UNISEX");

          if (form.promo_image instanceof File) {
            fd.append("promo_image_file", form.promo_image);
          }
          if (form.card_image instanceof File) {
            fd.append("card_image_file", form.card_image);
          }
          newMedia.forEach((f) => fd.append("gallery_files", f));

          if (id) {
            await http.patch(`/admin/products/${id}/`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            showToastNow("Product updated", true);
          } else {
            await http.post(`/admin/products/`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            showToastNow("Product created", true);
          }

          setTimeout(() => navigate("/admin/products"), 800);
        } catch (err) {
          console.error("Submit error:", err.response?.data || err.message);
          showToastNow("Failed to save product", false);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <AdminField label="Product Name" required>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              placeholder="Enter product name"
              className={adminInput}
              required
            />
          </AdminField>

          <AdminField label="Category" required>
            <input
              name="category"
              value={form.category || ""}
              onChange={handleChange}
              placeholder="Enter category"
              className={adminInput}
              required
            />
          </AdminField>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <AdminField label="Target Audience">
            <Dropdown
              value={form.target || "UNISEX"}
              onChange={(value) =>
                handleChange({ target: { name: "target", value } })
              }
              options={TARGET_OPTIONS}
              className="fld w-full rounded-lg px-4 py-3 text-sm"
              align="right"
            />
          </AdminField>

          <AdminField label="Price (RM)" required>
            <input
              name="price"
              type="number"
              step="0.01"
              value={form.price || ""}
              onChange={handleChange}
              placeholder="Enter price"
              className={adminInput}
              required
            />
          </AdminField>

          <AdminField label="Stock Quantity" required>
            <input
              name="stock"
              type="number"
              value={form.stock || ""}
              onChange={handleChange}
              placeholder="Enter stock quantity"
              className={adminInput}
              required
            />
          </AdminField>
        </div>

        <AdminField label="Description">
          <textarea
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            placeholder="Write product description"
            className={`${adminTextarea} h-32`}
          />
        </AdminField>

        <AdminField label="Tags">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
            <TagsInput
              tags={form.tags || []}
              setTags={(tags) =>
                setForm((prev) => ({ ...prev, tags }))
              }
            />
          </div>
        </AdminField>

        <div className="grid lg:grid-cols-2 gap-5">
          <AdminField label="Promo Image (16:9)">
            <input
              type="file"
              name="promo_image"
              onChange={handleFileChange}
              className={adminInput}
            />
            {form.promo_image && !(form.promo_image instanceof File) && (
              <div className="mt-3 rounded-xl bg-white/[0.03] border border-luxury-line p-3">
                <img
                  src={form.promo_image}
                  alt="Promo"
                  className="w-32 h-32 object-cover rounded-lg border border-luxury-line"
                />
                {id && (
                  <button
                    type="button"
                    onClick={removePromoImage}
                    className="mt-3 border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </AdminField>

          <AdminField label="Card Image">
            <input
              type="file"
              name="card_image"
              onChange={handleFileChange}
              className={adminInput}
            />
            {form.card_image && !(form.card_image instanceof File) && (
              <div className="mt-3 rounded-xl bg-white/[0.03] border border-luxury-line p-3">
                <img
                  src={form.card_image}
                  alt="Card"
                  className="w-32 h-32 object-cover rounded-lg border border-luxury-line"
                />
                {id && (
                  <button
                    type="button"
                    onClick={removeCardImage}
                    className="mt-3 border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </AdminField>
        </div>

        {id && (form.media_gallery || []).length > 0 && (
          <AdminField label="Existing Media">
            <div className="flex flex-wrap gap-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              {form.media_gallery.map((m) => (
                <div
                  key={m.id}
                  className="relative w-28 h-28 rounded-lg overflow-hidden border border-luxury-line bg-black/30"
                >
                  {m.type === "video" || m.type === "VIDEO" ? (
                    <video
                      src={m.file}
                      controls
                      className="w-full h-full object-cover bg-black"
                    />
                  ) : (
                    <img
                      src={m.file}
                      alt="media"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => removeGalleryMedia(m.id)}
                    className="absolute top-1 right-1 border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-2 py-1 text-[10px] label uppercase bg-luxury-bg/80"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </AdminField>
        )}

        <AdminField label="Add New Media">
          <input
            type="file"
            multiple
            onChange={handleNewMediaChange}
            className={adminInput}
          />
        </AdminField>

        <div className="sticky bottom-4 z-10 glass rounded-2xl p-4 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="ghost rounded-full px-5 py-2 text-[11px] label uppercase"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            type="submit"
            className="btn-lux rounded-full px-6 py-2 text-[11px] label uppercase disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : id
              ? "Update Product"
              : "Create Product"}
          </button>
        </div>
      </form>

      <AdminConfirm
        open={modal.show}
        title={modal.title}
        message={modal.message}
        confirmText="OK"
        cancelText="Cancel"
        tone="neutral"
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      {toast.show && (
        <AdminToast
          message={toast.message}
          type={toast.success ? "success" : "error"}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
