// src/pages/ReleasesPage.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : t === "UNISEX" ? "Unisex" : "";

const slideImg = (p) => p?.card_image || p?.promo_image || p?.media_gallery?.[0]?.file;

const fmtDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ReleasesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get("products/")
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProducts(items);
      })
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, []);

  // Newest first — this is the "release journal" order.
  const drops = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0) ||
          (b.id || 0) - (a.id || 0)
      ),
    [products]
  );

  if (loading) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
      </div>
    );
  }

  if (!drops.length) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center">
        <p className="font-cormorant italic text-2xl text-luxury-champagne/70">No releases found.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(55% 40% at 50% 0%,rgba(212,175,55,0.14),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-14">
        {/* Header */}
        <div className="text-center mb-14 md:mb-16">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">New &amp; Limited</p>
          <h1 className="font-serif text-5xl sm:text-6xl text-white mb-3">The Release Journal</h1>
          <p className="font-cormorant italic text-xl sm:text-2xl text-luxury-champagne">
            Every drop, in the order it arrived.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative pl-14 sm:pl-20">
          {/* vertical rail */}
          <div
            className="absolute left-5 sm:left-7 top-2 bottom-24 w-px"
            style={{ background: "linear-gradient(180deg,rgba(212,175,55,0.5),rgba(212,175,55,0.12))" }}
          />

          {drops.map((p, i) => {
            const odd = i % 2 === 1;
            const date = fmtDate(p.created_at);
            const eyebrow = [p.category && String(p.category).trim(), targetLabel(String(p.target || "").toUpperCase())]
              .filter(Boolean)
              .join(" · ");
            return (
              <article key={p.id} className="relative mb-14 md:mb-16">
                <span className="absolute -left-[2.15rem] sm:-left-[3.05rem] top-1 w-9 h-9 rounded-full bg-luxury-panel2 border border-luxury-gold/50 text-luxury-gold2 flex items-center justify-center text-[11px] label">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <p className="label uppercase text-[10px] text-luxury-mut mb-3">
                  {date || "Latest"}
                  {i === 0 ? " · Just Landed" : ""}
                </p>

                <div className="glass rounded-3xl overflow-hidden grid sm:grid-cols-2">
                  <div
                    className={`aspect-[4/3] sm:aspect-auto sm:min-h-[20rem] overflow-hidden bg-luxury-panel2 ${
                      odd ? "sm:order-2" : ""
                    }`}
                  >
                    {slideImg(p) ? (
                      <img src={slideImg(p)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-luxury-mut">{p.name}</div>
                    )}
                  </div>

                  <div className={`p-8 flex flex-col justify-center ${odd ? "sm:order-1" : ""}`}>
                    {i === 0 && (
                      <div className="mb-3">
                        <span className="px-3 py-1 rounded-full text-[9px] label uppercase border border-luxury-gold/40 text-luxury-gold2">
                          New
                        </span>
                      </div>
                    )}
                    {eyebrow && (
                      <p className="label uppercase text-[10px] text-luxury-gold2 mb-2">{eyebrow}</p>
                    )}
                    <h2 className="font-serif text-4xl text-white mb-3">{p.name}</h2>
                    {p.description && (
                      <p className="font-cormorant italic text-xl text-luxury-champagne leading-relaxed mb-6 line-clamp-3">
                        {p.description}
                      </p>
                    )}
                    <Link
                      to={`/product/${p.id}`}
                      className="ghost self-start px-7 py-3 rounded-full text-[11px] label uppercase"
                    >
                      Discover
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Next drop */}
          <div className="relative">
            <span className="absolute -left-[2.15rem] sm:-left-[3.05rem] top-1 w-9 h-9 rounded-full bg-luxury-panel2 border border-dashed border-luxury-gold/40 text-luxury-gold2 flex items-center justify-center">
              ✦
            </span>
            <div className="glass rounded-3xl p-10 text-center border-dashed">
              <p className="label uppercase text-[11px] text-luxury-gold2 mb-3">Coming Soon</p>
              <h3 className="font-serif text-3xl text-white mb-3">The next chapter is in composition</h3>
              <p className="text-luxury-mut mb-7 max-w-md mx-auto">
                Be the first to know when the next fragrance is released.
              </p>
              <a
                href="mailto:hello@gerainchan.com?subject=Notify%20me%20about%20the%20next%20release"
                className="btn-lux inline-block px-9 py-4 rounded-full text-[12px] font-medium label uppercase"
              >
                Notify Me
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
