// src/pages/admin/AdminReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";
import { IoClose, IoAlertCircle, IoCheckmarkCircle } from "react-icons/io5";

function Stars({ value }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className="text-yellow-400">
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

// ─────────────────────────────────────────────
// Toast (bottom-right)
// ─────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const color =
    type === "error"
      ? "bg-red-600/90 border-red-400"
      : "bg-green-600/90 border-green-400";

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-white ${color}`}
    >
      {type === "error" ? (
        <IoAlertCircle size={22} />
      ) : (
        <IoCheckmarkCircle size={22} />
      )}
      <p className="font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-3 opacity-80 hover:opacity-100"
      >
        <IoClose size={18} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Confirm modal
// ─────────────────────────────────────────────
function Confirm({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#10214f] text-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-3">Confirm Deletion</h3>
        <p className="text-white/80 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
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
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        <PageHeader title="Review Management" />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <select
            value={selectedProduct}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProduct(val);
              fetchReviews(val);
            }}
            className="bg-[#10224e] text-white rounded-lg px-4 py-2 w-full sm:w-80 border border-white/20 outline-none focus:ring-2 focus:ring-sky-500 transition"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => fetchReviews(selectedProduct)}
              className="px-5 py-2.5 bg-sky-600 rounded-lg hover:bg-sky-700 font-semibold text-white shadow-md transition w-full sm:w-auto"
            >
              Apply Filter
            </button>

            {/* Summary toggle */}
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white shadow-sm transition w-full sm:w-auto"
              title={summaryOpen ? "Hide summary" : "Show summary"}
            >
              {summaryOpen ? "Hide Summary" : "Show Summary"}
            </button>
          </div>
        </div>

        {/* Summary (collapsible) */}
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 mb-2 ${
            summaryOpen
              ? "max-h-[600px] opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm opacity-80">Reviews in view</div>
              <div className="text-3xl font-bold mt-1">{totalReviews}</div>
              {selectedProduct && (
                <div className="text-xs opacity-70 mt-1">
                  for <span className="font-semibold">{selectedProduct}</span>
                </div>
              )}
            </div>

            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm opacity-80">Average rating</div>
              <div className="flex items-center gap-2 mt-1">
                <Stars value={avgRating} />
                <span className="text-2xl font-bold">
                  {avgRating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm opacity-80">Top product (by reviews)</div>
              <div className="mt-1 text-lg font-semibold">
                {perProduct[0]?.name || "—"}
              </div>
              <div className="text-sm opacity-70">
                {perProduct[0] ? `${perProduct[0].count} review(s)` : ""}
              </div>
            </div>
          </div>

          {/* Per-product table (only when not filtering) */}
          {!selectedProduct && perProduct.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full bg-white/5 rounded-xl overflow-hidden">
                <thead className="bg-white/10 text-left">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Reviews</th>
                    <th className="px-4 py-3">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {perProduct.map((p) => (
                    <tr key={p.productId} className="border-t border-white/10">
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Stars value={p.avg} />
                          <span>{p.avg.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review list */}
        {loading ? (
          <p>Loading reviews...</p>
        ) : (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-white/70">No reviews found.</p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-gradient-to-br from-[#142d63] to-[#1a3a78] rounded-xl p-4 shadow-lg hover:shadow-xl transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">
                        {r.user?.username || "Unknown User"}{" "}
                        <span className="ml-1">
                          <Stars value={r.rating} />
                        </span>
                      </h3>
                      <p className="text-sm text-white/70">
                        Product:{" "}
                        <span className="text-white">
                          {r.product?.name || "N/A"}
                        </span>{" "}
                        | {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          setExpanded(expanded === r.id ? null : r.id)
                        }
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-sm ${
                          expanded === r.id
                            ? "bg-gray-600 hover:bg-gray-700 text-white"
                            : "bg-sky-600 hover:bg-sky-700 text-white"
                        }`}
                      >
                        {expanded === r.id ? "Hide" : "View"}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1.5 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expanded === r.id && (
                    <div className="mt-3 border-t border-white/20 pt-3 space-y-2">
                      <p className="text-white/80">
                        {r.comment || "(No comment)"}
                      </p>

                      {r.media_gallery?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                          {r.media_gallery.map((m) => (
                            <div
                              key={m.id}
                              className="relative w-full aspect-[4/3] bg-[#0b1b3a] rounded-lg overflow-hidden border border-white/10 shadow-sm"
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
                                  className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
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
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <Confirm
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Toast */}
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
