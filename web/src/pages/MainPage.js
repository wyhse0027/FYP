import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import http from "../lib/http";

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : "Unisex";

const productImg = (p) =>
  p?.promo_image || p?.card_image || p?.media_gallery?.[0]?.file || null;

const cardImg = (p) =>
  p?.card_image || p?.promo_image || p?.media_gallery?.[0]?.file || null;

export default function MainPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    http
      .get("products/")
      .then((res) => {
        if (!alive) return;
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProducts(items);
      })
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const hero = products[0] || null;
  const collection = products.slice(0, 4);

  return (
    <div className="relative">
      {/* Gold radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(55% 45% at 70% 0%,rgba(212,175,55,0.16),transparent 60%)",
        }}
      />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-8 items-center min-h-[72vh] py-12 md:py-16">
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            className="lg:col-span-6"
          >
            <p className="label uppercase text-[11px] text-luxury-gold2 mb-6 md:mb-7">
              Maison de Parfum — Est. 2026
            </p>
            <h1 className="font-serif font-medium text-white leading-[0.95] text-5xl sm:text-7xl lg:text-8xl mb-6">
              {hero ? (
                <>
                  {hero.name}
                  <br />
                  <span className="gold-text">
                    {hero.category ? hero.category : "Signature"}
                  </span>
                </>
              ) : (
                <>
                  Eleganza
                  <br />
                  <span className="gold-text">Noir Absolu</span>
                </>
              )}
            </h1>
            <p className="font-cormorant italic text-2xl sm:text-3xl text-luxury-champagne max-w-xl mb-6 line-clamp-3">
              {hero?.description ||
                "Black pepper and bergamot, drawn into oud, crimson rose and leather."}
            </p>
            <p className="text-base text-luxury-mut max-w-md leading-relaxed mb-9 md:mb-10">
              A modern maison blending scent, storytelling and technology —
              composed to be remembered long after you leave the room.
            </p>
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <Link
                to={hero ? `/product/${hero.id}` : "/shop"}
                className="btn-lux px-9 sm:px-10 py-4 rounded-full text-[12px] font-medium label uppercase"
              >
                Discover the Scent
              </Link>
              <Link
                to={hero ? `/product/${hero.id}` : "/shop"}
                className="ghost px-9 sm:px-10 py-4 rounded-full text-[12px] font-medium label uppercase inline-flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2 4 6v6c0 5 3.4 7.7 8 10 4.6-2.3 8-5 8-10V6z" />
                </svg>
                View in AR
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            className="lg:col-span-6 relative flex items-center justify-center"
          >
            <div
              className="absolute w-[20rem] h-[20rem] sm:w-[26rem] sm:h-[26rem] rounded-full"
              style={{
                background:
                  "radial-gradient(circle,rgba(212,175,55,0.22),transparent 62%)",
              }}
            />
            {productImg(hero) ? (
              <img
                src={productImg(hero)}
                alt={hero?.name || "Featured fragrance"}
                className="relative max-h-[52vh] md:max-h-[60vh] object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.7)]"
              />
            ) : (
              <div className="relative w-64 h-80 rounded-2xl bg-luxury-panel2" />
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── Collection ───────────────────────────────── */}
      <section className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12 md:py-16">
        <div className="flex items-center gap-6 mb-10 md:mb-12">
          <span className="font-serif text-3xl text-white">The Collection</span>
          <div className="flex-1 rule" />
          <Link
            to="/shop"
            className="text-[11px] label uppercase text-luxury-gold2 hover:text-white transition border-b border-luxury-gold/50 hover:border-luxury-gold pb-0.5"
          >
            View all
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] max-w-[320px] rounded-2xl glass p-5">
                  <div className="skel rounded-xl aspect-[3/4] mb-5" />
                  <div className="skel h-3 w-20 mb-3 rounded" />
                  <div className="skel h-5 w-28 rounded" />
                </div>
              ))
            : collection.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="card block rounded-2xl glass p-5 w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] max-w-[320px]"
                >
                  <div className="rounded-xl overflow-hidden aspect-[3/4] mb-5 bg-luxury-panel2">
                    {cardImg(p) ? (
                      <img
                        src={cardImg(p)}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <p className="label uppercase text-[10px] text-luxury-gold2 mb-1.5">
                    {p.category || "Signature"}
                    {p.target ? ` · ${targetLabel(p.target)}` : ""}
                  </p>
                  <h3 className="font-serif text-xl text-white">{p.name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-cormorant text-xl text-luxury-champagne">
                      RM {p.price}
                    </span>
                    <span className="text-luxury-gold2 text-sm">✦</span>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* ─── Quiz band ────────────────────────────────── */}
      <section className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-8 md:py-10">
        <div className="glass rounded-3xl px-8 sm:px-10 py-12 md:py-14 text-center overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 45% at 50% 0%,rgba(212,175,55,0.14),transparent 60%)",
            }}
          />
          <p className="relative label uppercase text-[11px] text-luxury-gold2 mb-4">
            The Atelier
          </p>
          <h2 className="relative font-serif text-3xl sm:text-5xl text-white mb-4">
            Discover your signature scent
          </h2>
          <p className="relative font-cormorant italic text-2xl text-luxury-champagne max-w-xl mx-auto mb-8 md:mb-9">
            Six questions. One fragrance, composed for you.
          </p>
          <Link
            to="/quiz"
            className="relative btn-lux px-10 py-4 rounded-full text-[12px] font-medium label uppercase inline-block"
          >
            Begin the Quiz
          </Link>
        </div>
      </section>
    </div>
  );
}
