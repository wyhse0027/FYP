// src/pages/RateOrderPage.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import http from "../lib/http";

const Star = ({ filled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-2xl ${filled ? "text-yellow-400" : "text-gray-500"}`}
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
      <div className="min-h-screen w-full bg-[#0c1a3a] px-4 sm:px-6 md:px-10 lg:px-16 text-white">
        <div className="mx-auto w-full max-w-screen-2xl py-8">
          <PageHeader title="Rate Order" />
          <div className="bg-white/5 rounded-xl p-6">Loading order…</div>
        </div>
      </div>
    );
  }

  // ─── Handle media selection ─────────────────────────────
  const handleFileChange = (pid, e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => ({ ...prev, [pid]: newFiles }));
  };

  // ─── Submit reviews ─────────────────────────────
  const onSubmit = async () => {
    try {
      for (const item of order.items) {
        const pid = item.product.id;
        const stars = Number(ratings[pid] || 0);

        if (stars > 0) {
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

      await http.post(`orders/${order.id}/complete/`);

      nav("/orders?tab=HISTORY", { replace: true });
    } catch (err) {
      console.error("Error submitting reviews:", err);
      alert("Failed to submit reviews. Please try again.");
    }
  };

  // ─── UI ─────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-4 sm:px-6 md:px-10 lg:px-16 text-white">
      <div className="mx-auto w-full max-w-screen-2xl py-8">
        <PageHeader title="Rate your items" />

        <div className="mt-4 grid gap-5">
          {order.items.map((it) => {
            const pid = it.product.id;
            const name = it.product.name;
            const img =
              it.product.card_image || it.product.promo_image || null;
            const qty = it.quantity;
            const rating = Number(ratings[pid] || 0);

            return (
              <div
                key={pid}
                className="bg-white/5 rounded-2xl p-4 sm:p-5 lg:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Image block – full width on mobile, fixed on larger screens */}
                  <div className="w-full sm:w-32 md:w-40">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/20 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt={name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-white/60 text-sm">No image</div>
                      )}
                    </div>
                  </div>

                  {/* Right side content */}
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Title + View product */}
                    <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-1 xs:gap-3">
                      <div className="text-base sm:text-lg md:text-xl font-semibold leading-snug">
                        {name}
                      </div>
                      <Link
                        className="text-sky-400 text-sm sm:text-xs md:text-sm underline mt-1 xs:mt-0"
                        to={`/product/${pid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View product
                      </Link>
                    </div>

                    <div className="text-white/70 text-xs sm:text-sm">
                      Qty: {qty}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            filled={n <= rating}
                            onClick={() =>
                              setRatings((s) => ({ ...s, [pid]: n }))
                            }
                          />
                        ))}
                      </div>
                      <span className="text-white/80 text-sm">
                        {rating || 0}/5
                      </span>
                    </div>

                    {/* Comment */}
                    <textarea
                      rows={3}
                      className="w-full bg-white/10 rounded-lg p-3 text-sm outline-none focus:ring-4 focus:ring-sky-500/30"
                      placeholder="Tell others what you liked (optional)…"
                      value={comments[pid] || ""}
                      onChange={(e) =>
                        setComments((c) => ({
                          ...c,
                          [pid]: e.target.value,
                        }))
                      }
                    />

                    {/* File upload – mobile-friendly button */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <label className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-sm font-semibold cursor-pointer w-full sm:w-auto text-center">
                        Choose files
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => handleFileChange(pid, e)}
                          className="hidden"
                        />
                      </label>
                      <div className="text-xs text-white/70">
                        {files[pid]?.length
                          ? `${files[pid].length} file(s) selected`
                          : "No files selected"}
                      </div>
                    </div>
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
