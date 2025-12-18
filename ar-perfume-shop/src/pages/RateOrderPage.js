// src/pages/RateOrderPage.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import http from "../lib/http"; // ✅ use wrapper

const Star = ({ filled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-2xl md:text-3xl ${
      filled ? "text-yellow-400" : "text-gray-500"
    }`}
    aria-label={filled ? "star-filled" : "star"}
  >
    ★
  </button>
);

export default function RateOrderPage() {
  const { id } = useParams(); // order id
  const nav = useNavigate();

  const [order, setOrder] = useState(null);
  const [ratings, setRatings] = useState({}); // { [productId]: 1..5 }
  const [comments, setComments] = useState({}); // { [productId]: "..." }
  const [files, setFiles] = useState({}); // { [productId]: [File, File...] }

  // ─── Fetch order details ─────────────────────────────
  useEffect(() => {
    http
      .get(`orders/${id}/`)
      .then((res) => setOrder(res.data))
      .catch((err) => console.error("Error loading order:", err));
  }, [id]);

  if (!order) {
    return (
      <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16 text-white">
        <div className="mx-auto w-full max-w-screen-2xl py-8">
          <PageHeader title="Rate Order" />
          <div className="bg-white/5 rounded-xl p-6">Loading order…</div>
        </div>
      </div>
    );
  }

  // ─── Handle media selection ─────────────────────────────
  const handleFileChange = (pid, e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => ({ ...prev, [pid]: newFiles }));
  };

  // ─── Submit reviews ─────────────────────────────
  const onSubmit = async () => {
    try {
      for (const item of order.items) {
        const pid = item.product.id;
        const stars = Number(ratings[pid] || 0);

        if (stars > 0) {
          // ✅ Send review + files in one request
          const formData = new FormData();
          formData.append("product_id", pid);
          formData.append("rating", stars);
          formData.append("comment", comments[pid] || "");
          if (files[pid]?.length) {
            files[pid].forEach((file) => formData.append("files", file));
          }

          await http.post("reviews/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      // ✅ Mark order as completed
      await http.post(`orders/${order.id}/complete/`);

      nav("/orders?tab=HISTORY", { replace: true });
    } catch (err) {
      console.error("Error submitting reviews:", err);
      alert("Failed to submit reviews. Please try again.");
    }
  };

  // ─── UI ─────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16 text-white">
      <div className="mx-auto w-full max-w-screen-2xl py-8">
        <PageHeader title="Rate your items" />

        <div className="grid gap-6">
          {order.items.map((it) => {
            const pid = it.product.id;
            const name = it.product.name;
            const img =
              it.product.card_image || it.product.promo_image || null;
            const qty = it.quantity;
            const rating = Number(ratings[pid] || 0);

            return (
              <div key={pid} className="bg-white/5 rounded-2xl p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-white/60">No image</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg md:text-2xl font-semibold">
                        {name}
                      </div>
                      <Link
                        className="text-sky-400 underline"
                        to={`/product/${pid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View product
                      </Link>
                    </div>
                    <div className="text-white/70 text-sm mb-2">
                      Qty: {qty}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          filled={n <= rating}
                          onClick={() =>
                            setRatings((s) => ({ ...s, [pid]: n }))
                          }
                        />
                      ))}
                      <span className="ml-2 text-white/80">
                        {rating || 0}/5
                      </span>
                    </div>

                    {/* Comment */}
                    <textarea
                      rows={3}
                      className="w-full bg-white/10 rounded-lg p-3 outline-none focus:ring-4 focus:ring-sky-500/30 mb-3"
                      placeholder="Tell others what you liked (optional)…"
                      value={comments[pid] || ""}
                      onChange={(e) =>
                        setComments((c) => ({ ...c, [pid]: e.target.value }))
                      }
                    />

                    {/* File upload */}
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleFileChange(pid, e)}
                      className="text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600"
                    />
                    {files[pid]?.length > 0 && (
                      <div className="mt-2 text-xs text-white/70">
                        {files[pid].length} file(s) selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => nav("/orders?tab=TO_RATE")}
            className="flex-1 bg-white/10 hover:bg-white/15 rounded-xl py-3 font-semibold"
          >
            Back
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 bg-amber-500 hover:bg-amber-600 rounded-xl py-3 font-bold"
          >
            Submit reviews
          </button>
        </div>
      </div>
    </div>
  );
}
