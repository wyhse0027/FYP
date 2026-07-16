// src/pages/admin/AdminReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import { AdminConfirm, AdminToast, Toolbar } from "../../components/admin";
import Dropdown from "../../components/ui/Dropdown";

function Stars({ value }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className="text-luxury-gold2 tracking-[0.18em]" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

export default function AdminReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  useAdminChrome({ title: "Reviews", actions: null, backTo: "/admin/dashboard" });

  // Load products for dropdown
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await http.get("/admin/products/");
        const list = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProducts(list);
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    }
    loadProducts();
  }, []);

  // Load reviews (optionally filtered by product name)
  const fetchReviews = async (productName = "") => {
    setLoading(true);
    try {
      const query = productName
        ? `?product=${encodeURIComponent(productName)}`
        : "";
      const res = await http.get(`/admin/reviews/${query}`);
      setReviews(res.data || []);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const productOptions = useMemo(
    () => [
      { value: "", label: "All Products" },
      ...products.map((p) => ({ value: p.name, label: p.name })),
    ],
    [products]
  );

  // Aggregates
  const { totalReviews, avgRating, perProduct } = useMemo(() => {
    const byId = new Map(); // id -> {name, sum, count}
    let sum = 0;
    let count = 0;

    for (const r of reviews) {
      const rating = Number(r?.rating) || 0;
      sum += rating;
      count += 1;

      const pid = r?.product?.id;
      const pname = r?.product?.name || "Unknown";
      if (!pid) continue;
      const entry = byId.get(pid) || { name: pname, sum: 0, count: 0 };
      entry.sum += rating;
      entry.count += 1;
      byId.set(pid, entry);
    }

    const table = Array.from(byId, ([productId, v]) => ({
      productId,
      name: v.name,
      count: v.count,
      avg: v.count ? v.sum / v.count : 0,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      totalReviews: count,
      avgRating: count ? sum / count : 0,
      perProduct: table,
    };
  }, [reviews]);

  // Delete a review (opens confirm)
  const handleDelete = (id) => {
    setConfirmAction({
      message: "Are you sure you want to delete this review? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await http.delete(`/admin/reviews/${id}/`);
          setReviews((prev) => prev.filter((r) => r.id !== id));
          setToast({ type: "success", message: "Review deleted successfully." });
        } catch (err) {
          console.error(err);
          setToast({ type: "error", message: "Failed to delete review." });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <Toolbar
        filters={
          <Dropdown
            value={selectedProduct}
            onChange={(val) => {
              setSelectedProduct(val);
              fetchReviews(val);
            }}
            options={productOptions}
            className="fld min-w-full sm:min-w-[20rem] rounded-full px-4 py-3 text-sm"
            align="right"
          />
        }
        action={
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => fetchReviews(selectedProduct)}
              className="btn-lux rounded-full px-5 py-3 text-[11px] label uppercase"
            >
              Apply Filter
            </button>
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              className="ghost rounded-full px-5 py-3 text-[11px] label uppercase"
              title={summaryOpen ? "Hide summary" : "Show summary"}
            >
              {summaryOpen ? "Hide Summary" : "Show Summary"}
            </button>
          </div>
        }
      />

      {/* Summary (collapsible) */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
          summaryOpen
            ? "max-h-[700px] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="label uppercase text-[10px] text-luxury-mut">Reviews in view</div>
              <div className="font-serif text-4xl text-white mt-2">{totalReviews}</div>
              {selectedProduct && (
                <div className="text-xs text-luxury-mut mt-2">
                  for <span className="text-luxury-text">{selectedProduct}</span>
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="label uppercase text-[10px] text-luxury-mut">Average rating</div>
              <div className="flex items-center gap-3 mt-3">
                <Stars value={avgRating} />
                <span className="font-serif text-3xl text-white">
                  {avgRating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="label uppercase text-[10px] text-luxury-mut">Top product by reviews</div>
              <div className="font-serif text-xl text-white mt-2">
                {perProduct[0]?.name || "—"}
              </div>
              <div className="text-sm text-luxury-mut mt-1">
                {perProduct[0] ? `${perProduct[0].count} review(s)` : ""}
              </div>
            </div>
          </div>

          {/* Per-product table (only when not filtering) */}
          {!selectedProduct && perProduct.length > 0 && (
            <div className="space-y-2">
              {perProduct.map((p) => (
                <div
                  key={p.productId}
                  className="glass rounded-2xl px-4 py-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-center"
                >
                  <div>
                    <p className="label uppercase text-[10px] text-luxury-mut">Product</p>
                    <p className="text-luxury-text mt-1">{p.name}</p>
                  </div>
                  <div>
                    <p className="label uppercase text-[10px] text-luxury-mut">Reviews</p>
                    <p className="font-serif text-xl text-white mt-1">{p.count}</p>
                  </div>
                  <div>
                    <p className="label uppercase text-[10px] text-luxury-mut">Average</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Stars value={p.avg} />
                      <span className="text-luxury-text">{p.avg.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review list */}
      {loading ? (
        <p className="text-sm text-luxury-mut">Loading reviews...</p>
      ) : (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-luxury-mut">No reviews found.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-xl text-white">
                        {r.user?.username || "Unknown User"}
                      </h3>
                      <Stars value={r.rating} />
                    </div>
                    <p className="text-sm text-luxury-mut mt-2">
                      Product:{" "}
                      <span className="text-luxury-text">
                        {r.product?.name || "N/A"}
                      </span>{" "}
                      · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setExpanded(expanded === r.id ? null : r.id)
                      }
                      className="ghost rounded-full px-3 py-1.5 text-[11px] label uppercase text-luxury-gold2"
                    >
                      {expanded === r.id ? "Hide" : "View"}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="mt-4 border-t border-luxury-line pt-4 space-y-4">
                    <p className="text-sm text-luxury-text">
                      {r.comment || "(No comment)"}
                    </p>

                    {r.media_gallery?.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {r.media_gallery.map((m) => (
                          <div
                            key={m.id}
                            className="relative w-full aspect-[4/3] glass rounded-xl overflow-hidden border border-luxury-line"
                          >
                            {m.type === "IMAGE" ? (
                              <img
                                src={m.file}
                                alt="Review media"
                                className="absolute inset-0 w-full h-full object-contain p-1"
                              />
                            ) : (
                              <video
                                src={m.file}
                                controls
                                className="absolute inset-0 w-full h-full object-contain bg-black rounded-xl"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {confirmAction && (
        <AdminConfirm
          open
          title="Delete Review"
          message={confirmAction.message}
          confirmText="Delete"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
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
