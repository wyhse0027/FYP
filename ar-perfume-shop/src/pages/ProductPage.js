// src/pages/ProductPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import {
  IoChevronBack,
  IoChevronForward,
  IoStar,
  IoStarOutline,
  IoCartOutline,
  IoSparkles,
  IoClose,
  IoTrash,
  IoCloudUpload,
} from "react-icons/io5";

/* ----------------------------- Utils ----------------------------- */
const formatTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim());
  return [];
};

/* ----------------------------- UI Components (Lovable layout, keep your luxury palette) ----------------------------- */
function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        className="bg-gradient-to-br from-luxury-navy via-luxury-navy/95 to-luxury-navy/90 border border-luxury-gold/20 text-white rounded-3xl shadow-2xl max-w-sm w-full p-6"
      >
        <h2 className="text-xl font-bold mb-3 text-luxury-gold">{title}</h2>
        <p className="text-luxury-silver mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-xl font-semibold transition-all duration-300"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Toast({ message, type = "success", onClose }) {
  return (
    <div
      className="
        fixed inset-x-0 bottom-24 sm:bottom-6 z-[60]
        flex justify-center px-4
        pointer-events-none
      "
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        className={`
          pointer-events-auto
          w-full sm:w-auto max-w-md
          px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm
          ${
            type === "error"
              ? "bg-red-500/90 border-red-400/30"
              : "bg-emerald-500/90 border-emerald-400/30"
          }
          text-white
        `}
      >
        <div className="flex items-center gap-3">
          <IoSparkles className="text-xl shrink-0" />
          <span className="font-medium flex-1 text-center">{message}</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white ml-2"
          >
            <IoClose className="text-xl" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}



function AddToCartModal({ product, qty, setQty, onClose, onConfirm }) {
  const dec = () => qty > 1 && setQty(qty - 1);
  const inc = () => setQty(qty + 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        className="bg-gradient-to-br from-luxury-navy via-luxury-navy/95 to-luxury-navy/90 border border-luxury-gold/20 text-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8"
      >
        <div className="text-center mb-8">
          <IoSparkles className="text-luxury-gold text-4xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-luxury-gold">{product?.name}</h2>
          <p className="text-luxury-silver mt-2">Select quantity</p>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={dec}
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 border border-luxury-gold/20 text-2xl font-bold transition-all duration-300"
          >
            −
          </motion.button>

          <div className="w-20 sm:w-24 text-center py-3 border border-luxury-gold/30 rounded-2xl text-2xl font-bold bg-white/5">
            {qty}
          </div>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={inc}
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 border border-luxury-gold/20 text-2xl font-bold transition-all duration-300"
          >
            +
          </motion.button>
        </div>

        <div className="text-center mb-8">
          <span className="text-luxury-silver">Total: </span>
          <span className="text-2xl font-bold text-luxury-gold">
            RM {(parseFloat(product?.price || 0) * qty).toFixed(2)}
          </span>
        </div>

        <div className="flex gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="
              flex-1
              px-4 py-3 sm:px-6 sm:py-4
              bg-white/10 hover:bg-white/20
              border border-white/20
              rounded-xl sm:rounded-2xl
              font-semibold
              transition-all duration-300
              text-base sm:text-lg
            "
          >
            Cancel
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="
              flex-1
              px-4 py-3 sm:px-6 sm:py-4
              bg-gradient-to-r from-luxury-gold to-luxury-gold/80
              hover:from-luxury-gold/90 hover:to-luxury-gold/70
              text-luxury-navy
              rounded-xl sm:rounded-2xl
              font-bold
              transition-all duration-300
              shadow-lg shadow-luxury-gold/20
              text-base sm:text-lg
            "
          >
            <span className="inline-flex items-center justify-center gap-2">
              <IoCartOutline className="text-2xl sm:text-xl" />
              <span className="leading-none whitespace-nowrap">Add to Cart</span>
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewCard({ review, currentUserId, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-luxury-gold/30 to-luxury-accent/30 flex items-center justify-center overflow-hidden">
          <img
            src={review.user?.avatar || "https://i.pravatar.cc/50"}
            alt={review.user?.username || "User"}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <div className="font-semibold text-white">{review.user?.username}</div>
          <div className="flex gap-0.5 text-luxury-gold">
            {[...Array(5)].map((_, i) =>
              i < review.rating ? (
                <IoStar key={i} />
              ) : (
                <IoStarOutline key={i} className="text-white/30" />
              )
            )}
          </div>
        </div>

        {review.user?.id === currentUserId && (
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(review)}
              className="text-sm text-luxury-accent hover:text-luxury-gold transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(review)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <p className="text-luxury-silver leading-relaxed mb-3">{review.comment}</p>

      {review.media_gallery?.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {review.media_gallery.map((m) => (
            <div key={m.id} className="aspect-video rounded-xl overflow-hidden border border-white/10">
              {m.type === "IMAGE" ? (
                <img src={m.file} alt="Review media" className="w-full h-full object-cover" />
              ) : (
                <video src={m.file} controls className="w-full h-full object-cover bg-black" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-luxury-silver/50 mt-3">
        {new Date(review.created_at).toLocaleString()}
      </div>
    </motion.div>
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
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // edit review state
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editFiles, setEditFiles] = useState([]);

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
    const baseTags = formatTags(product.tags);
    let genderTag = null;

    if (product.target === "MEN") genderTag = "For Men";
    else if (product.target === "WOMEN") genderTag = "For Women";
    else if (product.target === "UNISEX") genderTag = "Unisex";

    return genderTag ? [genderTag, ...baseTags] : baseTags;
  }, [product]);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  // Ratings (prefer server aggregates)
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

  const confirmAdd = async () => {
    try {
      // keep your existing CartContext API: addToCart(product, qty)
      await addToCart(product, qty);
      setCartOpen(false);
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
    const threshold = 50;

    if (Math.abs(distance) > threshold) {
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
  const handleEditFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setEditFiles(files);
  };

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
            prev
              ? { ...prev, media_gallery: (prev.media_gallery || []).filter((m) => m.id !== mid) }
              : prev
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
      <div className="min-h-screen bg-luxury-navy flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-2 border-luxury-gold border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-luxury-navy flex items-center justify-center">
        <p className="text-luxury-silver text-xl">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-navy text-white relative overflow-hidden">
      {/* Background Effects (Lovable glow layout, keep your colors) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[640px] h-[640px] bg-luxury-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-luxury-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div className="max-w-screen-2xl mx-auto py-6">
            <PageHeader title={product.name} backTo="/shop" />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 pb-16">
          <div className="max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
              {/* Gallery (Lovable card style) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55 }}
              >
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                  <div
                    className="relative aspect-square bg-gradient-to-br from-black/20 to-black/10 rounded-2xl overflow-hidden group touch-pan-y"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                    onTouchMove={(e) => setTouchEnd(e.touches[0].clientX)}
                  >
                    <AnimatePresence mode="wait">
                      {media.length > 0 ? (
                        <motion.div
                          key={activeIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                          className="w-full h-full"
                        >
                          {String(media[activeIndex]?.type || "").toUpperCase() === "IMAGE" ||
                          String(media[activeIndex]?.type || "").toLowerCase() === "image" ? (
                            <img
                              src={media[activeIndex].file}
                              alt={`${product.name} ${activeIndex + 1}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <video
                              src={media[activeIndex].file}
                              controls
                              className="w-full h-full object-contain bg-black"
                            />
                          )}
                        </motion.div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-luxury-silver">
                          No media available
                        </div>
                      )}
                    </AnimatePresence>

                    {media.length > 1 && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveIndex((p) => (p > 0 ? p - 1 : media.length - 1))}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-luxury-gold/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                          aria-label="Previous"
                        >
                          <IoChevronBack className="text-2xl" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveIndex((p) => (p + 1) % media.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-luxury-gold/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                          aria-label="Next"
                        >
                          <IoChevronForward className="text-2xl" />
                        </motion.button>

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {media.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveIndex(i)}
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                i === activeIndex
                                  ? "bg-luxury-gold w-8"
                                  : "bg-white/40 hover:bg-white/70 w-2.5"
                              }`}
                              aria-label={`Go to image ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails (Lovable strip) */}
                  {media.length > 1 && (
                    <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-luxury-gold/30">
                      {media.map((m, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveIndex(i)}
                          className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            i === activeIndex
                              ? "border-luxury-gold shadow-lg shadow-luxury-gold/20"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {String(m?.type || "").toUpperCase() === "IMAGE" ||
                          String(m?.type || "").toLowerCase() === "image" ? (
                            <img src={m.file} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-black/50 flex items-center justify-center text-xs text-luxury-silver">
                              Video
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Details (Lovable sections) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.05 }}
                className="flex flex-col gap-6"
              >
                {/* Title & Rating */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-luxury-gold via-luxury-gold to-luxury-accent bg-clip-text text-transparent">
                    {product.name}
                  </h1>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setReviewsOpen(true)}
                    className="mt-4 inline-flex items-center gap-3 group"
                  >
                    <div className="flex gap-0.5 text-luxury-gold text-xl">
                      {[...Array(5)].map((_, i) =>
                        i < Math.round(ratingAvg) ? (
                          <IoStar key={i} />
                        ) : (
                          <IoStarOutline key={i} className="text-white/30" />
                        )
                      )}
                    </div>
                    <span className="text-luxury-silver group-hover:text-luxury-gold transition-colors">
                      {ratingCount > 0
                        ? `${ratingAvg.toFixed(1)} · ${ratingCount} review${ratingCount > 1 ? "s" : ""}`
                        : "No reviews yet"}
                    </span>
                  </motion.button>
                </div>

                {/* AR Badges */}
                {arList.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {arList.map((ar) => (
                      <motion.span
                        key={ar.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                          ar.type === "MARKER"
                            ? "bg-purple-500/20 border border-purple-400/30 text-purple-300"
                            : "bg-pink-500/20 border border-pink-400/30 text-pink-300"
                        }`}
                      >
                        <IoSparkles />
                        {ar.type === "MARKER" ? "Marker AR" : "Markerless AR"}
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Price & Stock */}
                <div className="flex items-center gap-6 flex-wrap">
                  <span className="text-4xl font-bold text-luxury-gold">
                    RM {parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className="px-4 py-2 bg-white/10 rounded-full text-luxury-silver text-sm border border-white/10">
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag, i) => (
                      <motion.span
                        key={`${tag}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="px-4 py-1.5 bg-luxury-accent/20 border border-luxury-accent/30 text-luxury-accent rounded-full text-sm"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-luxury-gold font-semibold mb-3 flex items-center gap-2">
                    <IoSparkles /> Description
                  </h3>
                  <p className="text-luxury-silver leading-relaxed">
                    {product.description || "No description available."}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCartOpen(true)}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-luxury-gold to-luxury-gold/80 text-luxury-navy font-bold rounded-2xl shadow-lg shadow-luxury-gold/20 flex items-center justify-center gap-3 transition-all duration-300"
                  >
                    <IoCartOutline className="text-2xl sm:text-xl" />
                    Add to Cart
                  </motion.button>

                  {arList.map((ar) => (
                    <motion.button
                      key={ar.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(ar.type === "MARKER" ? markerViewerLink : "#")}
                      className={`flex-1 py-4 px-6 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                        ar.type === "MARKER"
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20"
                          : "bg-gradient-to-r from-pink-500 to-pink-600 shadow-lg shadow-pink-500/20"
                      }`}
                    >
                      <IoSparkles className="text-xl" />
                      {ar.type === "MARKER" ? "Try AR" : "AR (Coming Soon)"}
                    </motion.button>
                  ))}
                </div>

                {/* AR Download Card */}
                {hasAnyDownload && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="
                      bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-purple-600/30
                      border border-purple-400/20 rounded-3xl p-6
                      flex flex-col sm:flex-row
                      sm:items-center
                      gap-4 sm:gap-5
                    "
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
                      📱
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">Download AR App</h3>
                      <p className="text-luxury-silver text-sm break-words">
                        Experience fragrance in augmented reality
                      </p>
                    </div>

                    {firstDownloadHref && (
                      <motion.a
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        href={firstDownloadHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          w-full sm:w-auto
                          shrink-0 whitespace-nowrap
                          px-6 py-3
                          bg-gradient-to-r from-emerald-500 to-emerald-600
                          text-white font-semibold rounded-xl
                          shadow-lg shadow-emerald-500/20
                          text-center
                        "
                      >
                        Download
                      </motion.a>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* AddToCartModal */}
      <AnimatePresence>
        {cartOpen && (
          <AddToCartModal
            product={product}
            qty={qty}
            setQty={setQty}
            onClose={() => setCartOpen(false)}
            onConfirm={confirmAdd}
          />
        )}
      </AnimatePresence>

      {/* Reviews Overlay (Lovable modal style) */}
      <AnimatePresence>
        {reviewsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 14 }}
              className="bg-gradient-to-br from-luxury-navy via-luxury-navy/98 to-luxury-navy/95 border border-luxury-gold/20 max-w-2xl w-full rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-luxury-gold flex items-center gap-3">
                  <IoStar /> Reviews
                </h2>
                <button
                  onClick={() => setReviewsOpen(false)}
                  className="text-white/70 hover:text-white"
                  aria-label="Close reviews"
                >
                  <IoClose className="text-2xl" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {reviews.length ? (
                  reviews.map((r) => (
                    <ReviewCard
                      key={r.id}
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
                        })
                      }
                    />
                  ))
                ) : (
                  <p className="text-center text-luxury-silver py-8">No reviews yet</p>
                )}
              </div>

              <div className="p-6 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setReviewsOpen(false)}
                  className="w-full py-4 bg-gradient-to-r from-luxury-gold to-luxury-gold/80 text-luxury-navy font-bold rounded-2xl"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Review Modal (Lovable luxury style) */}
      <AnimatePresence>
        {editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 14 }}
              className="bg-gradient-to-br from-luxury-navy via-luxury-navy/98 to-luxury-navy/95 border border-luxury-gold/20 text-white rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-luxury-gold">Edit Review</h2>
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
                    className={`text-3xl transition-colors ${
                      n <= editRating ? "text-luxury-gold" : "text-white/20"
                    }`}
                    aria-label={`Rate ${n}`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-3 text-luxury-silver">{editRating}/5</span>
              </div>

              <textarea
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 outline-none focus:border-luxury-gold/50 transition-colors mb-4"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Write your review..."
              />

              {/* Existing media */}
              {editingReview.media_gallery?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-luxury-silver mb-2">Existing media</p>
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

              {/* New files */}
              <div className="mb-6">
                <label className="flex items-center gap-3 px-4 py-3 bg-white/10 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-luxury-gold/50 transition-colors">
                  <IoCloudUpload className="text-2xl text-luxury-gold" />
                  <span className="text-luxury-silver text-sm">Add more photos/videos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleEditFilesChange}
                    className="hidden"
                  />
                </label>
                {editFiles.length > 0 && (
                  <p className="mt-2 text-xs text-luxury-gold">{editFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setEditingReview(null);
                    setEditFiles([]);
                  }}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateReview}
                  className="flex-1 py-3 bg-gradient-to-r from-luxury-gold to-luxury-gold/80 text-luxury-navy rounded-xl font-bold"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Confirm */}
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
    </div>
  );
}
