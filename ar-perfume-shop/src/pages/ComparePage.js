// src/pages/ComparePage.js
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import http from "../lib/http"; // ✅ axios wrapper with BASE_URL
import {
  IoSwapHorizontalOutline,
  IoClose,
  IoTrashOutline,
} from "react-icons/io5";

/* ---------- helpers ---------- */
const money = (n) =>
  typeof n === "number"
    ? `RM ${n.toFixed(2)}`
    : typeof n === "string" && n.trim().length
    ? n
    : "—";

const listify = (val) => {
  if (!val) return "—";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
};

const productImage = (p) => p?.card_image || ""; // ✅ only card_image

/* ---------- main page ---------- */
export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const [picker, setPicker] = useState({ open: false, side: "left" });
  const [products, setProducts] = useState([]);

  const a = params.get("a");
  const b = params.get("b");

  // fetch products from backend
  useEffect(() => {
    http
      .get("products/")
      .then((res) => setProducts(res.data))
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

  // Values to show
  const L = {
    category: listify(left?.category),
    tags: listify(left?.tags),
    size: listify(left?.size || left?.volume),
    rating: listify(left?.rating),
    price: money(left?.price),
  };
  const R = {
    category: listify(right?.category),
    tags: listify(right?.tags),
    size: listify(right?.size || right?.volume),
    rating: listify(right?.rating),
    price: money(right?.price),
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-4 md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-screen-2xl py-6">
        <PageHeader
          title="Compare"
          right={
            <div className="flex gap-3">
              <button
                onClick={swap}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-3 rounded-xl text-base md:text-lg"
                title="Swap"
              >
                <IoSwapHorizontalOutline className="text-xl" />
                <span className="hidden sm:inline">Swap</span>
              </button>
              <button
                onClick={clearBoth}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-3 rounded-xl text-base md:text-lg"
                title="Clear"
              >
                <IoTrashOutline className="text-xl" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-white">
          {/* LEFT CARD */}
          <div className="lg:col-span-3">
            <ProductPanel
              product={left}
              placeholder="Select product"
              onChange={() => setPicker({ open: true, side: "left" })}
              onRemove={() => setSide("left", null)}
            />
          </div>

          {/* CENTER COMPARISON */}
          <div className="lg:col-span-6 bg-white/5 rounded-2xl p-6 md:p-8">
            <h3 className="text-center font-extrabold text-2xl md:text-3xl mb-6">
              Specifications
            </h3>

            <SpecRowTriple label="Category" left={L.category} right={R.category} />
            <SpecRowTriple label="Tags" left={L.tags} right={R.tags} />
            <SpecRowTriple label="Size" left={L.size} right={R.size} />
            <SpecRowTriple label="Rating" left={L.rating} right={R.rating} />
            <SpecRowTriple label="Price" left={L.price} right={R.price} />
          </div>

          {/* RIGHT CARD */}
          <div className="lg:col-span-3">
            <ProductPanel
              product={right}
              placeholder="Select product"
              onChange={() => setPicker({ open: true, side: "right" })}
              onRemove={() => setSide("right", null)}
            />
          </div>
        </div>
      </div>

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
  );
}

/* ---------- UI bits ---------- */
function ProductPanel({ product, placeholder, onChange, onRemove }) {
  const title = product?.name || placeholder;
  const img = productImage(product);

  return (
    <div className="bg-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg md:text-xl text-center w-full">
          {title}
        </div>
        <div className="shrink-0 ml-3 flex gap-2">
          <button
            onClick={onChange}
            className="text-sm md:text-base px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          >
            Change
          </button>
          {product && (
            <button
              onClick={onRemove}
              className="text-sm md:text-base px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
              title="Remove"
            >
              <IoClose className="text-xl" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-black/10 aspect-[4/3] flex items-center justify-center mb-5">
        {product ? (
          <img src={img} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="opacity-60 text-center px-4">No product selected</div>
        )}
      </div>

      <div className="text-center">
        <div className="text-sm md:text-base opacity-80">Price</div>
        <div className="text-xl md:text-2xl font-bold mt-0.5">
          {product ? money(product.price) : "—"}
        </div>
      </div>
    </div>
  );
}

function SpecRowTriple({ label, left, right }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-center py-4 md:py-5 border-b border-white/10 last:border-0">
      <div className="text-center text-lg md:text-xl break-words">{left}</div>
      <div className="text-center font-extrabold text-xl md:text-2xl tracking-wide">
        {label}
      </div>
      <div className="text-center text-lg md:text-xl break-words">{right}</div>
    </div>
  );
}

/* ---------- Picker Modal ---------- */
function ProductPicker({ products, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-4xl bg-[#0b1a38] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-xl">Select product</div>
          <button onClick={onClose} className="text-3xl leading-none">
            <IoClose />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="bg-white/10 hover:bg-white/15 rounded-2xl p-3 text-left"
            >
              <div className="rounded-xl overflow-hidden bg-black/10 aspect-[4/5] mb-3 flex items-center justify-center">
                <img
                  src={p.card_image} // ✅ use card_image only
                  alt={p.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="text-sm opacity-70">{money(p.price)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
