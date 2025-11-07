import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import http from "../lib/http";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

/* ----------------------------- Utils ----------------------------- */
const formatTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim());
  return [];
};

/* ----------------------------- UI Bits ---------------------------- */
function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1e293b] text-white rounded-xl shadow-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-bold mb-3">{title}</h2>
        <p className="text-white/80 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onClose }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg animate-fadeIn ${
        type === "error" ? "bg-red-600" : "bg-green-600"
      } text-white`}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}

function AddToCartModal({ product, qty, setQty, onClose, onConfirm }) {
  const dec = () => qty > 1 && setQty(qty - 1);
  const inc = () => setQty(qty + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] text-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
        <h2 className="text-xl font-bold text-center mb-6">{product.name}</h2>
        <div className="flex items-center justify-center gap-5 mb-8">
          <button
            onClick={dec}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-2xl font-bold"
          >
            –
          </button>
          <input
            type="text"
            value={qty}
            readOnly
            className="w-20 text-center border border-gray-500 rounded-lg py-2 text-lg font-semibold bg-gray-800"
          />
          <button
            onClick={inc}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-2xl font-bold"
          >
            +
          </button>
        </div>
        <div className="flex justify-between gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-lg shadow-blue-500/30"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, currentUserId, onEdit, onDelete, onDeleteMedia }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <img
          src={review.user?.avatar || "https://i.pravatar.cc/50"}
          alt={review.user?.username || "User"}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <div className="font-semibold">{review.user?.username}</div>
          <div className="text-yellow-400">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </div>
        </div>
        {review.user?.id === currentUserId && (
          <div className="flex gap-2">
            <button onClick={() => onEdit(review)} className="text-sm text-blue-400 hover:underline">
              Edit
            </button>
            <button onClick={() => onDelete(review)} className="text-sm text-red-400 hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>
      <p className="text-white/80 mb-2">{review.comment}</p>
      {review.media_gallery?.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          {review.media_gallery.map((m) => (
            <div key={m.id} className="relative group">
              {m.type === "IMAGE" ? (
                <img src={m.file} alt="Review media" className="w-full h-32 object-cover rounded-lg" />
              ) : (
                <video src={m.file} controls className="w-full h-32 object-cover rounded-lg bg-black" />
              )}
              {review.user?.id === currentUserId && (
                <button
                  onClick={() => onDeleteMedia(m.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-white/50 mt-2">{new Date(review.created_at).toLocaleString()}</div>
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
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function fetchData() {
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
      }
    }
    fetchData();
  }, [id]);

  const media = useMemo(() => product?.media_gallery || [], [product]);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  const avgRating = reviews.length ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : 0;

  const confirmAdd = async () => {
    try {
      await addToCart(product, qty);
      setCartOpen(false);
      showToast(`${product.name} added to cart! ✅`);
    } catch {
      showToast("Failed to add item to cart ❌", "error");
    }
  };

  // Auto-slide every 3s
  useEffect(() => {
    if (media.length > 1 && !paused) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % media.length);
      }, 3000);
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
  }, [touchEnd]);

  const hasAnyDownload = arList.some(
    (ar) => ar.app_download_file_url || ar.app_download_url
  );

  const firstDownloadHref =
    arList.find((ar) => ar.app_download_file_url || ar.app_download_url)?.app_download_file_url ||
    arList.find((ar) => ar.app_download_file_url || ar.app_download_url)?.app_download_url ||
    null;

  const markerViewerLink = `/arview/${product?.name?.toLowerCase().replace(/\s+/g, "-")}`;

  if (!product) return <p className="text-white p-6">Loading product…</p>;

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white">
      <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="max-w-screen-2xl mx-auto py-6">
          <PageHeader title={product.name} />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* --------- Gallery --------- */}
            <div className="lg:col-span-6 xl:col-span-7">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-6">
                <div
                  className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black/20 rounded-xl overflow-hidden flex items-center justify-center group touch-pan-y"
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                  onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
                  onTouchMove={(e) => setTouchEnd(e.touches[0].clientX)}
                >
                  {media.length > 0 ? (
                    <>
                      {media[activeIndex]?.type === "image" ? (
                        <img
                          key={media[activeIndex].file}
                          src={media[activeIndex].file}
                          alt={`${product.name} preview ${activeIndex + 1}`}
                          className="w-full h-full object-contain transition-opacity duration-700 ease-in-out opacity-100"
                        />
                      ) : (
                        <video
                          key={media[activeIndex].file}
                          src={media[activeIndex].file}
                          controls
                          className="w-full h-full object-contain bg-black transition-opacity duration-700 ease-in-out opacity-100"
                        />
                      )}

                      {/* Arrows */}
                      {media.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setActiveIndex((p) => (p > 0 ? p - 1 : media.length - 1))
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => setActiveIndex((p) => (p + 1) % media.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition"
                          >
                            →
                          </button>
                        </>
                      )}

                      {/* Dots */}
                      {media.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                          {media.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveIndex(i)}
                              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                i === activeIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60">
                      No media
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {media.length > 1 && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-3 overflow-x-auto pb-2 px-2 justify-center">
                      {media.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          className={`relative flex-none w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border transition-transform duration-200 ${
                            i === activeIndex
                              ? "border-sky-400 scale-105"
                              : "border-white/20 hover:scale-105"
                          }`}
                        >
                          {m.type === "image" ? (
                            <img src={m.file} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-black flex items-center justify-center text-xs text-white/70">
                              🎬 Video
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --------- Details --------- */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-4">
              <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setReviewsOpen(true)}>
                <div className="text-yellow-400 text-lg">
                  {"★".repeat(Math.round(avgRating))}
                  {"☆".repeat(5 - Math.round(avgRating))}
                </div>
                <span className="text-sm text-white/70">({reviews.length} reviews)</span>
              </div>

              {/* AR Badges */}
              {arList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {arList.map((ar) => (
                    <span
                      key={ar.id}
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        ar.type === "MARKER"
                          ? "bg-purple-700/40 text-purple-300"
                          : "bg-pink-700/40 text-pink-300"
                      }`}
                    >
                      {ar.type === "MARKER" ? "Marker-based AR Available" : "Markerless AR Available"}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center flex-wrap gap-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-green-400">
                  RM {parseFloat(product.price).toFixed(2)}
                </span>
                <span className="text-white/70">Stock: {product.stock}</span>
              </div>

              {product.tags && (
                <div className="flex flex-wrap gap-2">
                  {formatTags(product.tags).map((tag, i) => (
                    <span key={i} className="bg-blue-700/60 text-white px-3 py-1 rounded-full text-xs sm:text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-white/5 rounded-xl p-4 max-h-56 overflow-y-auto">
                <p className="text-white/80 leading-relaxed">
                  {product.description || "No description available."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setCartOpen(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition"
                >
                  Add to Cart
                </button>

                {/* Launch AR */}
                {arList.length > 0 &&
                  arList.map((ar) => (
                    <button
                      key={ar.id}
                      onClick={() =>
                        navigate(
                          ar.type === "MARKER" ? markerViewerLink : "#"
                        )
                      }
                      className={`flex-1 py-3 rounded-lg font-semibold transition shadow-lg ${
                        ar.type === "MARKER"
                          ? "bg-purple-700 hover:bg-purple-800 text-white shadow-purple-500/30"
                          : "bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/30"
                      }`}
                    >
                      {ar.type === "MARKER"
                        ? "Launch Marker-based AR"
                        : "Launch Markerless AR (Coming Soon)"}
                    </button>
                  ))}
              </div>

              {/* Download AR App banner */}
              {hasAnyDownload && (
                <div className="relative mt-3">
                  <div className="bg-gradient-to-r from-purple-700/90 via-pink-600/90 to-purple-800/90 text-white rounded-2xl px-5 sm:px-7 py-5 shadow-xl flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 text-2xl">
                      📱
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold tracking-wide">
                        Download the AR App
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm">
                        For a more immersive and interactive fragrance experience.
                      </p>
                    </div>
                    {firstDownloadHref && (
                      <a
                        href={firstDownloadHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2.5 rounded-full font-semibold shadow-lg transition-all text-sm"
                        title="Download AR App (APK)"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AddToCartModal */}
      {cartOpen && (
        <AddToCartModal
          product={product}
          qty={qty}
          setQty={setQty}
          onClose={() => setCartOpen(false)}
          onConfirm={confirmAdd}
        />
      )}

      {/* Reviews overlay */}
      {reviewsOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-[#1a1a2e] max-w-lg w-full rounded-2xl overflow-y-auto max-h-[90%] p-6">
            <h2 className="text-xl font-bold mb-4">{product.name} Reviews</h2>
            <div className="space-y-4">
              {reviews.length ? (
                reviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    currentUserId={user?.id}
                    onEdit={setEditingReview}
                    onDelete={(rev) =>
                      setConfirmAction({
                        title: "Delete Review",
                        message: "Are you sure you want to delete this review?",
                        onConfirm: async () => {
                          try {
                            await http.delete(`reviews/${rev.id}/`);
                            showToast("Review deleted ✅");
                            setReviews((prev) =>
                              prev.filter((x) => x.id !== rev.id)
                            );
                          } catch {
                            showToast("Failed to delete review ❌", "error");
                          }
                          setConfirmAction(null);
                        },
                      })
                    }
                    onDeleteMedia={async (mid) => {
                      try {
                        await http.delete(`review-media/${mid}/`);
                        showToast("Media deleted ✅");
                        setReviews((prev) =>
                          prev.map((rev) => ({
                            ...rev,
                            media_gallery: rev.media_gallery.filter(
                              (m) => m.id !== mid
                            ),
                          }))
                        );
                      } catch {
                        showToast("Failed to delete media ❌", "error");
                      }
                    }}
                  />
                ))
              ) : (
                <p className="text-white/60">No reviews yet.</p>
              )}
            </div>
            <button
              onClick={() => setReviewsOpen(false)}
              className="mt-6 w-full bg-sky-600 py-3 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </div>
  );
}
