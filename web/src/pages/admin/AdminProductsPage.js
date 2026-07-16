import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminModal,
  AdminToast,
  DataTable,
  StatusPill,
} from "../../components/admin";

const COLUMNS = [
  { label: "ID" },
  { label: "Name" },
  { label: "Category" },
  { label: "Target" },
  { label: "Price", align: "right" },
  { label: "Stock", align: "right" },
  { label: "Actions", align: "right" },
];

const addProductAction = (
  <Link
    to="/admin/products/new"
    className="btn-lux px-6 py-3 rounded-full text-[11px] font-medium label uppercase"
  >
    Add Product
  </Link>
);

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString();
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [details, setDetails] = useState(null);
  const [confirmProduct, setConfirmProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  useAdminChrome({ title: "Products", actions: addProductAction, backTo: "/admin/dashboard" });

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await http.get("/admin/products/");
      setProducts(res.data);
      setErr("");
    } catch {
      setErr("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Real delete handler - called from confirm modal
  const handleDelete = async () => {
    if (!confirmProduct) return;
    try {
      await http.delete(`/admin/products/${confirmProduct.id}/`);
      setConfirmProduct(null);
      showToast("success", "Product deleted successfully.");
      fetchProducts();
    } catch {
      showToast("error", "Failed to delete product.");
    }
  };

  if (err) return <p className="text-red-300 text-sm">{err}</p>;

  return (
    <div className="space-y-2">
      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && products.length === 0}
        empty="No products found."
      >
        {products.map((p) => (
          <tr key={p.id} className="row">
            <td className="px-6 py-4 text-luxury-mut">#{p.id}</td>
            <td className="px-6 py-4 text-luxury-text">{p.name}</td>
            <td className="px-6 py-4 text-luxury-mut">{p.category}</td>
            <td className="px-6 py-4"><StatusPill status={p.target || "UNISEX"} /></td>
            <td className="px-6 py-4 text-right text-luxury-champagne" style={{ fontVariantNumeric: "tabular-nums" }}>
              RM {p.price}
            </td>
            <td className="px-6 py-4 text-right text-luxury-text" style={{ fontVariantNumeric: "tabular-nums" }}>
              {p.stock}
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDetails(p)}
                  className="ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  View
                </button>
                <button
                  onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                  className="ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmProduct(p)}
                  className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {details && (
        <AdminModal
          open
          title={`Product Details — ${details.name}`}
          onClose={() => setDetails(null)}
          size="xl"
        >
          <div className="flex flex-col gap-6">
            {/* Images */}
            <div className="flex flex-wrap gap-6 justify-center">
              {details.promo_image && (
                <div className="text-center">
                  <p className="label uppercase text-[10px] text-luxury-mut mb-2">
                    Promo Image
                  </p>
                  <img
                    src={details.promo_image}
                    alt="Promo"
                    className="rounded-lg border border-luxury-gold/20 max-h-80"
                  />
                </div>
              )}
              {details.card_image && (
                <div className="text-center">
                  <p className="label uppercase text-[10px] text-luxury-mut mb-2">
                    Card Image
                  </p>
                  <img
                    src={details.card_image}
                    alt="Card"
                    className="rounded-lg border border-luxury-gold/20 max-h-80"
                  />
                </div>
              )}
            </div>

            {/* Info grid */}
            <div className="grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Category</p>
                <p className="text-luxury-text">
                  {details.category}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Target</p>
                <p className="text-luxury-text">
                  {details.target || "UNISEX"}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Price</p>
                <p className="text-luxury-text">
                  RM {details.price}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Stock</p>
                <p className="text-luxury-text">
                  {details.stock}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Created At</p>
                <p className="text-luxury-text">
                  {formatDate(details.created_at)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Description</p>
                <p className="text-luxury-text">
                  {details.description || "No description"}
                </p>
              </div>

              {/* Tags */}
              {details.tags && (
                <div className="sm:col-span-2">
                  <p className="label uppercase text-[10px] text-luxury-mut mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(details.tags)
                      ? details.tags
                      : (() => {
                          if (typeof details.tags === "string") {
                            try {
                              const parsed = JSON.parse(details.tags);
                              if (Array.isArray(parsed)) return parsed;
                            } catch {
                              /* ignore */
                            }
                            return details.tags
                              .split(",")
                              .map((t) => t.trim());
                          }
                          return [];
                        })()
                    ).map((tag, i) => (
                      <span
                        key={i}
                        className="border border-luxury-gold/50 text-luxury-gold2 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Media gallery */}
            {details.media_gallery?.length > 0 && (
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-2">
                  Media Gallery
                </p>
                <div className="flex flex-wrap gap-4">
                  {details.media_gallery.map((m) => (
                    <div key={m.id} className="text-center">
                      <p className="text-xs text-luxury-mut mb-1">
                        {m.type === "video" || m.type === "VIDEO"
                          ? "Video"
                          : "Image"}
                      </p>
                      {m.type === "video" || m.type === "VIDEO" ? (
                        <video
                          src={m.file}
                          controls
                          className="rounded-lg border border-luxury-gold/20 max-h-60"
                        />
                      ) : (
                        <img
                          src={m.file}
                          alt="media"
                          className="rounded-lg border border-luxury-gold/20 max-h-60"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setDetails(null)}
              className="ghost rounded-full px-6 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </AdminModal>
      )}

      {confirmProduct && (
        <AdminConfirm
          open
          title="Delete Product"
          message={`Are you sure you want to delete product ${confirmProduct.name} (ID: ${confirmProduct.id})? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmProduct(null)}
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
