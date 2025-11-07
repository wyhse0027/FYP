import { useEffect, useState } from "react";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";

export default function AdminReviewPage() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Load all products for dropdown ────────────────────────────
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

  // ─── Load reviews ────────────────────────────
  const fetchReviews = async (productName = "") => {
    setLoading(true);
    try {
      const query = productName ? `?product=${encodeURIComponent(productName)}` : "";
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

  // ─── Handle delete ────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await http.delete(`/admin/reviews/${id}/`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to delete review");
    }
  };

  // ─── UI ────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        <PageHeader title="Review Management" />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value);
              fetchReviews(e.target.value);
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

          <button
            onClick={() => fetchReviews(selectedProduct)}
            className="px-5 py-2.5 bg-sky-600 rounded-lg hover:bg-sky-700 font-semibold text-white shadow-md transition"
          >
            Apply Filter
          </button>
        </div>

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
                        <span className="text-yellow-400 text-sm">
                          {"★".repeat(r.rating)}
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
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
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

                  {/* ─── Expanded Review Section ───────────────────── */}
                  {expanded === r.id && (
                    <div className="mt-3 border-t border-white/20 pt-3 space-y-2">
                      <p className="text-white/80">{r.comment || "(No comment)"}</p>

                      {/* Media Gallery (Updated) */}
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
    </div>
  );
}
