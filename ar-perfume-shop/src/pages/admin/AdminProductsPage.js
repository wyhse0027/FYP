// src/pages/admin/AdminProductsPage.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../lib/http";

// ✅ helper to format date
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
  const navigate = useNavigate();

  // Load products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await http.get("/admin/products/"); // ✅ admin endpoint
      setProducts(res.data);
    } catch {
      setErr("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Delete product
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await http.delete(`/admin/products/${id}/`); // ✅ admin endpoint
      fetchProducts();
    } catch {
      alert("Failed to delete product ❌");
    }
  };

  if (loading) return <div className="p-6 text-white">Loading products…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        {/* 🔙 Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 rounded-full hover:bg-white/10 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Manage Products</h1>
          <button
            onClick={() => navigate("/admin/products/new")}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 font-semibold"
          >
            + Add Product
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white/5 rounded-xl">
          <table className="w-full text-left text-white">
            <thead className="bg-white/10 text-sm">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-white/10">
                  <td className="p-3">{p.id}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">RM {p.price}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => setDetails(p)}
                      className="px-3 py-1 bg-sky-600 rounded hover:bg-sky-700 text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                      className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {details && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-[#0c1a3a] rounded-2xl p-6 sm:p-8 w-full max-w-5xl max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">
                Product Details — {details.name}
              </h2>

              <div className="flex flex-col gap-6">
                {/* Primary Images */}
                <div className="flex flex-wrap gap-6 justify-center">
                  {details.promo_image && (
                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-2">Promo Image</p>
                      <img
                        src={details.promo_image}
                        alt="Promo"
                        className="rounded-lg border-4 border-white/20 max-h-80"
                      />
                    </div>
                  )}
                  {details.card_image && (
                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-2">Card Image</p>
                      <img
                        src={details.card_image}
                        alt="Card"
                        className="rounded-lg border-4 border-white/20 max-h-80"
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div>
                    <p className="font-semibold">Category</p>
                    <p className="text-gray-300">{details.category}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Price</p>
                    <p className="text-gray-300">RM {details.price}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Stock</p>
                    <p className="text-gray-300">{details.stock}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Created At</p>
                    <p className="text-gray-300">{formatDate(details.created_at)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="font-semibold">Description</p>
                    <p className="text-gray-300">{details.description || "No description"}</p>
                  </div>

                  {/* ✅ Tags Pills with Safe Normalization */}
                  {details.tags && (
                    <div className="sm:col-span-2">
                      <p className="font-semibold mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          Array.isArray(details.tags)
                            ? details.tags
                            : (typeof details.tags === "string"
                                ? (() => {
                                    try {
                                      const parsed = JSON.parse(details.tags);
                                      return Array.isArray(parsed)
                                        ? parsed
                                        : details.tags.split(",").map((t) => t.trim());
                                    } catch {
                                      return details.tags.split(",").map((t) => t.trim());
                                    }
                                  })()
                                : [])
                        ).map((tag, i) => (
                          <span
                            key={i}
                            className="bg-blue-700/60 text-white px-3 py-1 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Gallery */}
                {details.media_gallery?.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Media Gallery</p>
                    <div className="flex flex-wrap gap-4">
                      {details.media_gallery.map((m) => (
                        <div key={m.id} className="text-center">
                          <p className="text-xs text-gray-400 mb-1">
                            {m.type === "video" ? "Video" : "Image"}
                          </p>
                          {m.type === "video" ? (
                            <video
                              src={m.file}
                              controls
                              className="rounded-lg border-2 border-white/20 max-h-60"
                            />
                          ) : (
                            <img
                              src={m.file}
                              alt="media"
                              className="rounded-lg border-2 border-white/20 max-h-60"
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
                  className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-700 font-semibold text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
