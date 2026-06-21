// src/pages/ComparePage.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import http from "../lib/http";
import {
  IoSwapHorizontalOutline,
  IoClose,
  IoTrashOutline,
  IoSparklesOutline,
} from "react-icons/io5";

/* ---------- helpers ---------- */
const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `RM ${v.toFixed(2)}` : "—";
};

const listify = (val) => {
  if (val == null) return "—";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  return String(val).trim() || "—";
};

const productImage = (p) =>
  p?.card_image || p?.promo_image || p?.media_gallery?.[0]?.file || "";

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const starBar = (avg) => {
  const n = Math.max(0, Math.min(5, Math.round(avg)));
  return "★".repeat(n) + "☆".repeat(5 - n);
};

// shorten long text for MOBILE only without cutting mid-word
const shortenForMobile = (value, max = 55) => {
  if (!value) return "—";
  const str = String(value);
  if (str.length <= max) return str;
  // try cut at last space before max
  const cutAt = str.lastIndexOf(" ", max);
  if (cutAt > 30) {
    return str.slice(0, cutAt).trim() + "…";
  }
  return str.slice(0, max).trim() + "…";
};

/* ---------- main page ---------- */
export default function ComparePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [picker, setPicker] = useState({ open: false, side: "left" });
  const [products, setProducts] = useState([]);
  const [details, setDetails] = useState({});

  const a = params.get("a");
  const b = params.get("b");

  // fetch products from backend
  useEffect(() => {
    http
      .get("products/")
      .then((res) => {
        const items = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];
        setProducts(items);
      })
      .catch((err) => console.error("❌ Error fetching products:", err));
  }, []);

  const byId = (id) => products.find((p) => String(p.id) === String(id));
  const left = useMemo(() => byId(a), [a, products]);
  const right = useMemo(() => byId(b), [b, products]);

  const setSide = (side, idOrNull) => {
    const next = new URLSearchParams(params);
    if (side === "left") {
      if (idOrNull) next.set("a", String(idOrNull));
      else next.delete("a");
    } else {
      if (idOrNull) next.set("b", String(idOrNull));
      else next.delete("b");
    }
    setParams(next, { replace: true });
  };

  const swap = () => {
    const next = new URLSearchParams(params);
    const va = next.get("a");
    const vb = next.get("b");
    if (vb) next.set("a", vb);
    else next.delete("a");
    if (va) next.set("b", va);
    else next.delete("b");
    setParams(next, { replace: true });
  };

  const clearBoth = () => setParams(new URLSearchParams(), { replace: true });

  // fetch detail (with aggregates) for selected ids
  const ensureDetail = (id) => {
    if (!id || details[id]) return;
    http
      .get(`products/${id}/`)
      .then((res) => setDetails((prev) => ({ ...prev, [id]: res.data || {} })))
      .catch(() => {});
  };

  useEffect(() => {
    ensureDetail(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a]);
  useEffect(() => {
    ensureDetail(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);

  const ratingInfo = (id, listItem) => {
    const d = id ? details[id] : null;

    const avg = Number(
      (d && d.rating_avg) ?? listItem?.rating_avg ?? listItem?.rating ?? 0
    );
    const count = Number((d && d.rating_count) ?? listItem?.rating_count ?? 0);

    return {
      avg: Number.isFinite(avg) ? avg : 0,
      count: Number.isFinite(count) ? count : 0,
    };
  };

  // ---------- derived values for left/right ----------
  const L = (() => {
    const target = listify(left?.target);
    const category = listify(left?.category);
    const tags = listify(parseTags(left?.tags));
    const { avg, count } = ratingInfo(a, left);
    const hasRating = Number.isFinite(avg) && avg > 0;
    const ratingStars = hasRating ? starBar(avg) : "—";
    const ratingValue = hasRating ? avg.toFixed(1) : "—";

    return {
      target,
      category,
      tags,
      // desktop display keeps old behaviour
      rating: hasRating
        ? `${ratingStars}  ${ratingValue} · ${count}`
        : "—",
      // mobile needs split rows + no count
      ratingStars,
      ratingValue,
      price: money(left?.price),
      name: left?.name || "",
    };
  })();

  const R = (() => {
    const target = listify(right?.target);
    const category = listify(right?.category);
    const tags = listify(parseTags(right?.tags));
    const { avg, count } = ratingInfo(b, right);
    const hasRating = Number.isFinite(avg) && avg > 0;
    const ratingStars = hasRating ? starBar(avg) : "—";
    const ratingValue = hasRating ? avg.toFixed(1) : "—";

    return {
      target,
      category,
      tags,
      rating: hasRating
        ? `${ratingStars}  ${ratingValue} · ${count}`
        : "—",
      ratingStars,
      ratingValue,
      price: money(right?.price),
      name: right?.name || "",
    };
  })();

  const bothSelected = !!left && !!right;

  return (
    <div className="min-h-screen w-full text-white bg-[#0c1a3a] relative overflow-hidden">
      {/* blue/white ambience + small gold accent glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 w-[520px] h-[520px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[520px] h-[520px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[420px] h-[420px] rounded-full bg-[rgba(212,175,55,0.08)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 md:px-8 lg:px-12 py-10">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/shop")} // back to shop
            className="
              group
              flex items-center justify-center
              w-12 h-12 rounded-full
              border border-[rgba(212,175,55,0.5)]
              bg-[#0c1a3a]
              hover:bg:white/10
              transition-all duration-300
            "
            aria-label="Back to shop"
          >
            <IoArrowBack
              className="
                text-xl
                text-white
                group-hover:text-[rgba(212,175,55,0.95)]
                transition-colors
              "
            />
          </button>
        </div>

        {/* HERO HEADER */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 text-[rgba(212,175,55,0.95)] text-[10px] md:text-sm font-semibold tracking-[0.35em] uppercase">
            <span>👑</span>
            <span>Side by Side</span>
            <span>👑</span>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span className="text-white">Compare </span>
            <span className="text-[rgba(212,175,55,0.95)]">Fragrances</span>
          </h1>

          <p className="mt-3 text-white/70 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Discover the perfect scent by comparing our exquisite collection.
          </p>

          {/* centered action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={swap}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3
                         bg-white/10 border border-white/15
                         hover:bg-white/15 transition text-sm sm:text-base"
              title="Swap"
            >
              <IoSwapHorizontalOutline className="text-lg sm:text-xl text-[rgba(212,175,55,0.95)]" />
              <span className="font-semibold">Swap</span>
            </button>

            <button
              onClick={clearBoth}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3
                         bg-white/10 border border-white/15
                         hover:bg-white/15 transition text-sm sm:text-base"
              title="Clear"
            >
              <IoTrashOutline className="text-lg sm:text-xl text-white/80" />
              <span className="font-semibold">Clear</span>
            </button>
          </div>
        </div>

        {/* DESKTOP GRID (unchanged behaviour, lg+ only) */}
        <div className="hidden lg:grid grid-cols-12 gap-8">
          {/* LEFT CARD – desktop */}
          <div className="lg:col-span-3">
            <ProductPanel
              label="Fragrance A"
              product={left}
              placeholder="Select First Fragrance"
              onChange={() => setPicker({ open: true, side: "left" })}
              onRemove={() => setSide("left", null)}
            />
          </div>

          {/* CENTER COMPARISON – desktop */}
          <div className="lg:col-span-6 rounded-3xl p-8 bg-white/10 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-6">
              <IoSparklesOutline className="text-[rgba(212,175,55,0.95)] text-xl" />
              <h3 className="text-center font-extrabold text-3xl">
                Specifications
              </h3>
              <IoSparklesOutline className="text-[rgba(212,175,55,0.95)] text-xl" />
            </div>

            <SpecRowTriple label="Target" left={L.target} right={R.target} />
            <SpecRowTriple label="Category" left={L.category} right={R.category} />
            <SpecRowTriple label="Tags" left={L.tags} right={R.tags} />
            <SpecRowTriple label="Rating" left={L.rating} right={R.rating} />
            <SpecRowTriple label="Price" left={L.price} right={R.price} isPrice />

            {!left && !right && (
              <div className="text-center py-12 text-white/60">
                <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <div className="h-7 w-7 rounded-md border border-white/20" />
                </div>
                <div className="text-lg">Select fragrances to compare</div>
              </div>
            )}
          </div>

          {/* RIGHT CARD – desktop */}
          <div className="lg:col-span-3">
            <ProductPanel
              label="Fragrance B"
              product={right}
              placeholder="Select Second Fragrance"
              onChange={() => setPicker({ open: true, side: "right" })}
              onRemove={() => setSide("right", null)}
            />
          </div>
        </div>

        {/* MOBILE / TABLET LAYOUT (lg:hidden) */}
        <div className="lg:hidden space-y-6">
          {/* STEP 1: selection only, no specs yet */}
          {!bothSelected && (
            <>
              <ProductPanel
                label="Fragrance A"
                product={left}
                placeholder="Select First Fragrance"
                onChange={() => setPicker({ open: true, side: "left" })}
                onRemove={() => setSide("left", null)}
              />

              <ProductPanel
                label="Fragrance B"
                product={right}
                placeholder="Select Second Fragrance"
                onChange={() => setPicker({ open: true, side: "right" })}
                onRemove={() => setSide("right", null)}
              />

              {!left && !right && (
                <div className="text-center pt-2 pb-4 text-white/65 text-xs">
                  Pick two fragrances above to start comparing.
                </div>
              )}
            </>
          )}

          {/* STEP 2: both selected – show ONLY names + specs + change */}
          {bothSelected && (
            <div className="rounded-3xl p-5 sm:p-6 bg-white/10 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <IoSparklesOutline className="text-[rgba(212,175,55,0.95)] text-lg" />
                <h3 className="text-center font-extrabold text-xl">
                  Specifications
                </h3>
                <IoSparklesOutline className="text-[rgba(212,175,55,0.95)] text-lg" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs sm:text-sm">
                <div className="flex flex-col h-full items-end text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1">
                    Fragrance A
                  </div>
                  <div className="font-semibold text-white break-words">
                    {L.name}
                  </div>
                  <button
                    onClick={() => setPicker({ open: true, side: "left" })}
                    className="mt-auto inline-flex items-center justify-center px-3 py-1.5 rounded-full
                              bg-white/10 border border-white/15 text-[rgba(212,175,55,0.95)]
                              text-[11px] font-semibold"
                  >
                    Change
                  </button>
                </div>

                <div className="flex flex-col h-full items-start text-left">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1">
                    Fragrance B
                  </div>
                  <div className="font-semibold text-white break-words">
                    {R.name}
                  </div>
                  <button
                    onClick={() => setPicker({ open: true, side: "right" })}
                    className="mt-auto inline-flex items-center justify-center px-3 py-1.5 rounded-full
                              bg-white/10 border border-white/15 text-[rgba(212,175,55,0.95)]
                              text-[11px] font-semibold"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* specs (no images) */}
              <SpecRowMobile
                label="Target"
                left={shortenForMobile(L.target, 24)}
                right={shortenForMobile(R.target, 24)}
              />
              <SpecRowMobile
                label="Category"
                left={shortenForMobile(L.category, 24)}
                right={shortenForMobile(R.category, 24)}
              />
              <SpecRowMobile
                label="Tags"
                left={L.tags}
                right={R.tags}
              />
              {/* rating: stars row + digits row, no count */}
              <SpecRowMobile
                label="Rating"
                left={{ stars: L.ratingStars, value: L.ratingValue }}
                right={{ stars: R.ratingStars, value: R.ratingValue }}
                ratingLayout
              />
              <SpecRowMobile
                label="Price"
                left={L.price}
                right={R.price}
                isPrice
              />
            </div>
          )}
        </div>

        {/* Picker Modal */}
        {picker.open && (
          <ProductPicker
            products={products}
            onClose={() => setPicker({ open: false, side: "left" })}
            onPick={(id) => {
              setSide(picker.side, id);
              setPicker({ open: false, side: "left" });
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */
function ProductPanel({ product, placeholder, onChange, onRemove, label }) {
  const title = product?.name || placeholder;
  const img = productImage(product);

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/10 border border-white/10 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          {label && (
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
              {label}
            </div>
          )}
          <div className="font-extrabold text-lg sm:text-xl break-words md:truncate">
            {title}
          </div>
          {product?.category && (
            <div className="text-xs sm:text-sm text-white/70 mt-1">
              {product.category}
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2">
          <button
            onClick={onChange}
            className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full
                       bg-white/10 border border-white/15
                       hover:bg-white/15 transition
                       text-[rgba(212,175,55,0.95)] font-semibold"
          >
            {product ? "Change" : "Select"}
          </button>

          {product && (
            <button
              onClick={onRemove}
              className="p-1.5 sm:p-2 rounded-full bg-white/10 border border-white/15
                         hover:bg-white/15 transition"
              title="Remove"
            >
              <IoClose className="text-lg sm:text-xl text-white/80" />
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black/20 aspect-[4/3] mb-5 border border-white/10">
        {product ? (
          <>
            <img
              src={img}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/55 px-4 text-center gap-3">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-md border border-white/20" />
            </div>
            <div className="text-xs sm:text-sm">No fragrance selected</div>
          </div>
        )}
      </div>

      <div className="text-center pt-3 border-t border-white/10">
        <div className="text-xs sm:text-sm text-white/60">Price</div>
        <div className="text-xl sm:text-2xl font-extrabold mt-1 text-[rgba(212,175,55,0.95)]">
          {product ? money(product.price) : "—"}
        </div>

        {/* subtle gold underline like screenshot */}
        <div className="mt-3 mx-auto h-[2px] w-10 bg-[rgba(212,175,55,0.7)] rounded-full" />
      </div>
    </div>
  );
}

/* ---------- Desktop spec row (3 columns, like before) ---------- */
function SpecRowTriple({ label, left, right, isPrice }) {
  const safeLeft = left ?? "—";
  const safeRight = right ?? "—";

  if (
    (safeLeft === "—" || safeLeft == null) &&
    (safeRight === "—" || safeRight == null)
  )
    return null;

  return (
    <div className="hidden lg:grid grid-cols-3 gap-4 items-center py-4 border-b border-white/10 last:border-0">
      <div
        className={`text-center whitespace-normal leading-relaxed px-2 ${
          isPrice
            ? "text-[rgba(212,175,55,0.95)] text-lg font-extrabold"
            : "text-white/90"
        }`}
      >
        {safeLeft}
      </div>

      <div className="text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/10 font-extrabold">
          {label}
        </span>
      </div>

      <div
        className={`text-center whitespace-normal leading-relaxed px-2 ${
          isPrice
            ? "text-[rgba(212,175,55,0.95)] text-lg font-extrabold"
            : "text-white/90"
        }`}
      >
        {safeRight}
      </div>
    </div>
  );
}

/* ---------- Mobile spec row ---------- */
function SpecRowMobile({
  label,
  left,
  right,
  isPrice,
  mono,
  ratingLayout = false,
}) {
  // ratingLayout: left/right are objects { stars, value }
  if (ratingLayout) {
    const hasLeft = left && left.value && left.value !== "—";
    const hasRight = right && right.value && right.value !== "—";
    if (!hasLeft && !hasRight) return null;

    return (
      <div className="py-3 border-b border-white/10 last:border-0">
        <div className="flex justify-center mb-2">
          <span className="inline-block w-32 text-center px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            {label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="text-right text-white/90">
            <div className="font-mono">{hasLeft ? left.stars : "—"}</div>
            <div className="mt-1">{hasLeft ? left.value : ""}</div>
          </div>
          <div className="text-left text-white/90">
            <div className="font-mono">{hasRight ? right.stars : "—"}</div>
            <div className="mt-1">{hasRight ? right.value : ""}</div>
          </div>
        </div>
      </div>
    );
  }

  const hasLeft = left && left !== "—";
  const hasRight = right && right !== "—";
  if (!hasLeft && !hasRight) return null;

  return (
    <div className="py-3 border-b border-white/10 last:border-0">
      <div className="flex justify-center mb-2">
        <span className="inline-block w-32 text-center px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
        <div
          className={`text-right whitespace-normal ${
            isPrice
              ? "text-[rgba(212,175,55,0.95)] font-extrabold"
              : "text-white/90"
          } ${mono ? "font-mono" : ""}`}
        >
          {hasLeft ? left : "—"}
        </div>
        <div
          className={`text-left whitespace-normal ${
            isPrice
              ? "text-[rgba(212,175,55,0.95)] font-extrabold"
              : "text-white/90"
          } ${mono ? "font-mono" : ""}`}
        >
          {hasRight ? right : "—"}
        </div>
      </div>
    </div>
  );
}

/* ---------- Picker Modal ---------- */
function ProductPicker({ products, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden bg-[#0b1a38] border border-white/10 text-white">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="font-extrabold text-xl">
            Select <span className="text-[rgba(212,175,55,0.95)]">Fragrance</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition"
          >
            <IoClose className="text-2xl text-white/85" />
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="rounded-2xl p-3 text-left bg-white/10 border border-white/10
                           hover:bg-white/15 transition"
              >
                <div className="rounded-xl overflow-hidden bg-black/20 aspect-[4/5] mb-3 border border-white/10">
                  <img
                    src={
                      p.card_image ||
                      p.promo_image ||
                      p?.media_gallery?.[0]?.file ||
                      ""
                    }
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="font-semibold text-base text-white line-clamp-2">
                  {p.name}
                </div>
                <div className="text-sm text-[rgba(212,175,55,0.95)] mt-1 font-semibold">
                  {money(p.price)}
                </div>
              </button>
            ))}
          </div>

          {!products?.length && (
            <div className="text-center py-10 text-white/60">
              No products found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
