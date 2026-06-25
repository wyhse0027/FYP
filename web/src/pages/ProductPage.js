// src/pages/ProductPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import {
  IoStar,
  IoStarOutline,
  IoClose,
  IoTrash,
  IoCloudUpload,
  IoSparkles,
} from "react-icons/io5";

/* ----------------------------- Utils ----------------------------- */
const formatTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim());
  return [];
};

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : "Unisex";

const STAGE = {
  background:
    "radial-gradient(120% 100% at 50% 20%,#16213f,#0a1124 55%,#070B14)",
};

/* ----------------------------- Overlays ----------------------------- */
function Toast({ message, type = "success", onClose }) {
  return (
    <div className="fixed inset-x-0 bottom-24 sm:bottom-6 z-[60] flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        className={`pointer-events-auto w-full sm:w-auto max-w-md px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm ${
          type === "error"
            ? "bg-red-500/90 border-red-400/30 text-white"
            : "btn-lux border-luxury-gold/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <IoSparkles className="text-xl shrink-0" />
          <span className="font-medium flex-1 text-center">{message}</span>
          <button onClick={onClose} className="text-current/70 hover:opacity-100 ml-2">
            <IoClose className="text-xl" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        className="glass rounded-3xl shadow-2xl max-w-sm w-full p-7 text-luxury-text"
      >
        <h2 className="font-serif text-2xl mb-3 text-white">{title}</h2>
        <p className="text-luxury-mut mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full border border-white/15 text-luxury-text hover:border-luxury-gold/40 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white font-semibold transition"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewLightbox({ item, onClose }) {
  if (!item) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
        aria-label="Close"
      >
        <IoClose className="text-2xl" />
      </button>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="max-w-5xl w-full max-h-[85vh] flex items-center justify-center"
      >
        {item.type === "IMAGE" ? (
          <img src={item.src} alt="Review media" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
        ) : (
          <video src={item.src} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl bg-black" />
        )}
      </motion.div>
    </motion.div>
  );
}

function ReviewCard({ review, currentUserId, onEdit, onDelete, onOpenMedia }) {
  return (
    <div className="glass rounded-2xl p-7">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full overflow-hidden border border-luxury-gold/30 shrink-0">
            <img
              src={review.user?.avatar || "https://i.pravatar.cc/80"}
              alt={review.user?.username || "User"}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-serif text-xl text-white truncate">{review.user?.username}</span>
        </div>
        <div className="flex gap-0.5 text-luxury-gold2 text-sm">
          {[...Array(5)].map((_, i) =>
            i < review.rating ? <IoStar key={i} /> : <IoStarOutline key={i} className="text-white/20" />
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-luxury-mut mb-2">{review.comment}</p>

      {review.media_gallery?.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {review.media_gallery.map((m) => (
            <button
              key={m.id}
              onClick={() => onOpenMedia({ type: m.type, src: m.file })}
              className="aspect-video rounded-xl overflow-hidden border border-white/10 hover:ring-2 hover:ring-luxury-gold/40 transition"
            >
              {m.type === "IMAGE" ? (
                <img src={m.file} alt="Review media" className="w-full h-full object-cover" />
              ) : (
                <video src={m.file} controls className="w-full h-full object-cover bg-black" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-luxury-mut/60">
          {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
        </span>
        {review.user?.id === currentUserId && (
          <div className="flex gap-4 text-[11px] label uppercase">
            <button onClick={() => onEdit(review)} className="text-luxury-gold2 hover:text-white transition">
              Edit
            </button>
            <button onClick={() => onDelete(review)} className="text-red-400 hover:text-red-300 transition">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Page ------------------------------ */
export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [arList, setArList] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [qty, setQty] = useState(1);

  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // edit review state
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editFiles, setEditFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const [loading, setLoading] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const prodRes = await http.get(`products/${id}/`);
        setProduct(prodRes.data);
        const arRes = await http.get(`/ar/?product=${id}`);
        const list = Array.isArray(arRes.data) ? arRes.data : arRes.data.results || [];
        setArList(list.filter((ar) => ar.enabled));
      } catch (err) {
        console.error("Failed to load product or AR experience:", err);
        setProduct(null);
      }
      try {
        const res = await http.get(`reviews/?product=${id}`);
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const media = useMemo(() => product?.media_gallery || [], [product]);

  const allTags = useMemo(() => {
    if (!product) return [];
    return formatTags(product.tags);
  }, [product]);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  const ratingAvg = useMemo(() => {
    const s = product?.rating_avg;
    if (s !== null && s !== undefined) return Number(s) || 0;
    return reviews.length ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : 0;
  }, [product?.rating_avg, reviews]);

  const ratingCount = useMemo(() => {
    const c = product?.rating_count;
    if (c !== null && c !== undefined) return Number(c) || 0;
    return reviews.length || 0;
  }, [product?.rating_count, reviews]);

  const handleAddToCart = async () => {
    try {
      await addToCart(product, qty);
      showToast(`${product.name} added to cart!`);
    } catch {
      showToast("Failed to add item to cart", "error");
    }
  };

  // Auto-slide
  useEffect(() => {
    if (media.length > 1 && !paused) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % media.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [media.length, paused]);

  // Swipe gestures
  useEffect(() => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > 50) {
      if (distance > 0) setActiveIndex((p) => (p + 1) % media.length);
      else setActiveIndex((p) => (p > 0 ? p - 1 : media.length - 1));
    }
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchEnd, touchStart, media.length]);

  const hasAnyDownload = arList.some((ar) => ar.app_download_file_url || ar.app_download_url);
  const firstDownloadHref =
    arList.find((ar) => ar.app_download_file_url || ar.app_download_url)?.app_download_file_url ||
    arList.find((ar) => ar.app_download_file_url || ar.app_download_url)?.app_download_url ||
    null;
  const markerViewerLink = `/arview/${product?.name?.toLowerCase().replace(/\s+/g, "-")}`;

  /* -------- Edit helpers -------- */
  const handleEditFilesChange = (e) => setEditFiles(Array.from(e.target.files || []));

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    try {
      const formData = new FormData();
      formData.append("rating", String(editRating));
      formData.append("comment", editComment || "");
      editFiles.forEach((file) => formData.append("files", file));
      const res = await http.patch(`reviews/${editingReview.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = res.data || { ...editingReview, rating: editRating, comment: editComment };
      setReviews((prev) => prev.map((r) => (r.id === editingReview.id ? updated : r)));
      setEditingReview(null);
      setEditFiles([]);
      showToast("Review updated!");
    } catch (err) {
      console.error("Update review error:", err?.response || err);
      showToast("Failed to update review", "error");
    }
  };

  const handleDeleteMedia = (mid) => {
    setConfirmAction({
      title: "Remove Media",
      message: "This will be permanently removed from your review.",
      onConfirm: async () => {
        try {
          await http.delete(`review-media/${mid}/`);
          showToast("Media deleted!");
          setReviews((prev) =>
            prev.map((rev) => ({
              ...rev,
              media_gallery: (rev.media_gallery || []).filter((m) => m.id !== mid),
            }))
          );
          setEditingReview((prev) =>
            prev ? { ...prev, media_gallery: (prev.media_gallery || []).filter((m) => m.id !== mid) } : prev
          );
        } catch (err) {
          console.error("Delete media error:", err?.response || err);
          showToast("Failed to delete media", "error");
        } finally {
          setConfirmAction(null);
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-cormorant italic text-2xl text-luxury-champagne/70">Product not found</p>
      </div>
    );
  }

  const activeMedia = media[activeIndex];
  const isImage = (m) => String(m?.type || "").toLowerCase() === "image";

  return (
    <div className="relative">
      {/* Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 70% 0%,rgba(212,175,55,0.12),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-8 md:py-10">
        {/* Breadcrumb */}
        <p className="label uppercase text-[11px] text-luxury-mut mb-8">
          <Link to="/shop" className="hover:text-white transition">
            Shop
          </Link>
          {product.category ? ` / ${String(product.category).trim()}` : ""} /{" "}
          <span className="text-luxury-gold/80">{product.name}</span>
        </p>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Gallery */}
          <div>
            <div
              className="relative rounded-3xl aspect-square glass overflow-hidden flex items-center justify-center group touch-pan-y"
              style={STAGE}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
              onTouchMove={(e) => setTouchEnd(e.touches[0].clientX)}
            >
              <div
                className="absolute w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle,rgba(212,175,55,0.2),transparent 62%)" }}
              />
              <AnimatePresence mode="wait">
                {media.length > 0 ? (
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    {isImage(activeMedia) ? (
                      <img
                        src={activeMedia.file}
                        alt={`${product.name} ${activeIndex + 1}`}
                        className="relative max-h-[78%] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)]"
                      />
                    ) : (
                      <video src={activeMedia.file} controls className="relative max-h-[80%] object-contain bg-black rounded-xl" />
                    )}
                  </motion.div>
                ) : (
                  <div className="relative text-luxury-mut">No media available</div>
                )}
              </AnimatePresence>

              {media.length > 1 && (
                <>
                  {/* Invisible tap zones for prev / next */}
                  <button
                    onClick={() => setActiveIndex((p) => (p > 0 ? p - 1 : media.length - 1))}
                    className="absolute left-0 top-0 h-full w-1/3 z-10 cursor-w-resize"
                    aria-label="Previous image"
                  />
                  <button
                    onClick={() => setActiveIndex((p) => (p + 1) % media.length)}
                    className="absolute right-0 top-0 h-full w-1/3 z-10 cursor-e-resize"
                    aria-label="Next image"
                  />
                  {/* Counter */}
                  <div className="absolute bottom-5 left-5 z-10 text-[12px] label uppercase tracking-[0.25em]">
                    <span className="text-luxury-gold2">{String(activeIndex + 1).padStart(2, "0")}</span>
                    <span className="text-luxury-mut"> / {String(media.length).padStart(2, "0")}</span>
                  </div>
                </>
              )}

              {arList.some((ar) => ar.type === "MARKER") && (
                <button
                  onClick={() => navigate(markerViewerLink)}
                  className="ghost absolute bottom-5 right-5 z-20 px-5 py-2.5 rounded-full text-[11px] label uppercase inline-flex items-center gap-2 backdrop-blur"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2 4 6v6c0 5 3.4 7.7 8 10 4.6-2.3 8-5 8-10V6z" />
                  </svg>
                  View in AR
                </button>
              )}
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {media.slice(0, 8).map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`rounded-xl aspect-square overflow-hidden border transition ${
                      i === activeIndex ? "border-luxury-gold/60" : "border-white/8 hover:border-white/25"
                    }`}
                    style={STAGE}
                  >
                    {isImage(m) ? (
                      <img src={m.file} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-luxury-mut">Video</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              {product.target && (
                <span className="px-3 py-1 rounded-full text-[10px] label uppercase border border-luxury-gold/40 text-luxury-gold2">
                  {targetLabel(String(product.target).toUpperCase())}
                </span>
              )}
              <span className="label uppercase text-[11px] text-luxury-mut">
                {product.category ? `${String(product.category).trim()} · ` : ""}Eau de Parfum
              </span>
            </div>

            <h1 className="font-serif text-5xl sm:text-7xl font-medium text-white leading-[0.95] mb-5">
              {product.name}
            </h1>

            <button onClick={() => {
              const el = document.getElementById("reviews");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} className="flex items-center gap-3 mb-7 group">
              <div className="flex text-luxury-gold2 text-lg">
                {[...Array(5)].map((_, i) =>
                  i < Math.round(ratingAvg) ? <IoStar key={i} /> : <IoStarOutline key={i} className="text-white/20" />
                )}
              </div>
              <span className="text-sm text-luxury-mut group-hover:text-luxury-gold2 transition">
                {ratingCount > 0
                  ? `${ratingAvg.toFixed(1)} · ${ratingCount} review${ratingCount > 1 ? "s" : ""}`
                  : "No reviews yet"}
              </span>
            </button>

            {product.description && (
              <p className="font-cormorant text-2xl text-luxury-champagne leading-relaxed max-w-xl mb-8">
                {product.description}
              </p>
            )}

            {/* AR badges */}
            {arList.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-8">
                {arList.map((ar) => (
                  <span
                    key={ar.id}
                    className="px-4 py-2 rounded-full text-[10px] label uppercase flex items-center gap-2 bg-luxury-gold/12 border border-luxury-gold/30 text-luxury-gold2"
                  >
                    <IoSparkles />
                    {ar.type === "MARKER" ? "Marker AR" : "Markerless AR"}
                  </span>
                ))}
              </div>
            )}

            <div className="rule mb-8" />

            {/* Price + qty */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </p>
                <p className="font-serif text-4xl text-white">RM {parseFloat(product.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center border border-white/15 rounded-full">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 text-luxury-mut hover:text-luxury-gold2 transition"
                  aria-label="Decrease quantity"
                >
                  –
                </button>
                <span className="w-8 text-center text-white">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-11 h-11 text-luxury-mut hover:text-luxury-gold2 transition"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="btn-lux flex-1 min-w-[220px] px-8 py-4 rounded-full text-[12px] font-medium label uppercase disabled:opacity-50"
              >
                Add to Cart
              </button>
              {arList.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => navigate(ar.type === "MARKER" ? markerViewerLink : "#")}
                  className="ghost px-8 py-4 rounded-full text-[12px] font-medium label uppercase inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2 4 6v6c0 5 3.4 7.7 8 10 4.6-2.3 8-5 8-10V6z" />
                  </svg>
                  {ar.type === "MARKER" ? "Try AR" : "AR Soon"}
                </button>
              ))}
            </div>

            {/* AR download */}
            {hasAnyDownload && firstDownloadHref && (
              <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center text-2xl shrink-0">
                  📱
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl text-white">Download AR App</h3>
                  <p className="text-sm text-luxury-mut">Experience this fragrance in augmented reality.</p>
                </div>
                <a
                  href={firstDownloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-lux px-6 py-3 rounded-full text-[11px] font-medium label uppercase text-center whitespace-nowrap"
                >
                  Download
                </a>
              </div>
            )}

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {allTags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="px-4 py-1.5 rounded-full text-[10px] label uppercase text-luxury-mut border border-white/12"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <section id="reviews" className="mt-20 scroll-mt-24">
          <div className="flex items-center gap-5 mb-8">
            <h2 className="font-serif text-3xl text-white">Reviews</h2>
            <div className="flex-1 rule" />
          </div>
          {reviews.length ? (
            <div className="flex flex-wrap justify-center gap-6">
              {reviews.map((r) => (
                <div key={r.id} className="w-full md:w-[calc(50%-0.75rem)]">
                <ReviewCard
                  review={r}
                  currentUserId={user?.id}
                  onEdit={(rev) => {
                    setEditingReview(rev);
                    setEditRating(rev.rating);
                    setEditComment(rev.comment || "");
                    setEditFiles([]);
                  }}
                  onDelete={(rev) =>
                    setConfirmAction({
                      title: "Delete Review",
                      message: "Are you sure you want to delete this review?",
                      onConfirm: async () => {
                        try {
                          await http.delete(`reviews/${rev.id}/`);
                          showToast("Review deleted!");
                          setReviews((prev) => prev.filter((x) => x.id !== rev.id));
                        } catch {
                          showToast("Failed to delete review", "error");
                        } finally {
                          setConfirmAction(null);
                        }
                      },
                      onCancel: () => setConfirmAction(null),
                    })
                  }
                  onOpenMedia={setLightbox}
                />
                </div>
              ))}
            </div>
          ) : (
            <p className="font-cormorant italic text-xl text-luxury-champagne/70">
              No reviews yet — be the first to share your impression.
            </p>
          )}
        </section>
      </main>

      {/* Edit Review Modal */}
      <AnimatePresence>
        {editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 14 }}
              className="glass rounded-3xl p-7 w-full max-w-md text-luxury-text"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl text-white">Edit Review</h2>
                <button
                  onClick={() => {
                    setEditingReview(null);
                    setEditFiles([]);
                  }}
                  className="text-white/70 hover:text-white"
                  aria-label="Close edit review"
                >
                  <IoClose className="text-2xl" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditRating(n)}
                    className={`text-3xl transition-colors ${n <= editRating ? "text-luxury-gold2" : "text-white/20"}`}
                    aria-label={`Rate ${n}`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 text-luxury-mut">{editRating}/5</span>
              </div>

              <textarea
                rows={4}
                className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 outline-none focus:border-luxury-gold/50 transition-colors mb-4 text-luxury-text"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Write your review..."
              />

              {editingReview.media_gallery?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-luxury-mut mb-2">Existing media</p>
                  <div className="grid grid-cols-3 gap-2">
                    {editingReview.media_gallery.map((m) => (
                      <div key={m.id} className="relative group aspect-square rounded-xl overflow-hidden">
                        {m.type === "IMAGE" ? (
                          <img src={m.file} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={m.file} className="w-full h-full object-cover bg-black" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(m.id)}
                          className="absolute top-1 right-1 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete media"
                        >
                          <IoTrash className="text-white text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-luxury-gold/50 transition-colors">
                  <IoCloudUpload className="text-2xl text-luxury-gold2" />
                  <span className="text-luxury-mut text-sm">Add more photos/videos</span>
                  <input type="file" multiple accept="image/*,video/*" onChange={handleEditFilesChange} className="hidden" />
                </label>
                {editFiles.length > 0 && (
                  <p className="mt-2 text-xs text-luxury-gold2">{editFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEditingReview(null);
                    setEditFiles([]);
                  }}
                  className="flex-1 py-3 rounded-full border border-white/15 text-luxury-text hover:border-luxury-gold/40 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateReview}
                  className="btn-lux flex-1 py-3 rounded-full text-[12px] font-medium label uppercase"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            onCancel={() => setConfirmAction(null)}
            onConfirm={confirmAction.onConfirm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && <ReviewLightbox item={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  );
}
