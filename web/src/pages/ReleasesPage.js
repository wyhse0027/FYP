// src/pages/ReleasesPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectCoverflow } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : t === "UNISEX" ? "Unisex" : "";

const heroImg = (p) => p?.promo_image || p?.card_image || p?.media_gallery?.[0]?.file;
const slideImg = (p) => p?.card_image || p?.promo_image || p?.media_gallery?.[0]?.file;

export default function ReleasesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

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

  if (loading) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center">
        <p className="font-cormorant italic text-2xl text-luxury-champagne/70">No releases found.</p>
      </div>
    );
  }

  const featured = products[0]; // fixed on the newest release
  const total = products.length;
  const eyebrow = [featured.category && String(featured.category).trim(), targetLabel(String(featured.target || "").toUpperCase())]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(55% 45% at 70% 0%,rgba(212,175,55,0.16),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">New &amp; Limited</p>
          <h1 className="font-serif text-5xl sm:text-6xl text-white mb-3">Releases</h1>
          <p className="font-cormorant italic text-xl sm:text-2xl text-luxury-champagne">
            The newest chapters of the house.
          </p>
        </div>

        {/* Featured (fixed on newest) */}
        <section className="grid lg:grid-cols-2 gap-10 items-center mb-16 md:mb-20">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] label uppercase border border-luxury-gold/40 text-luxury-gold2 mb-5">
              Just Landed
            </span>
            {eyebrow && (
              <p className="label uppercase text-[11px] text-luxury-gold2 mb-3">{eyebrow}</p>
            )}
            <h2 className="font-serif text-5xl sm:text-6xl text-white leading-[0.95] mb-5">
              {featured.name}
            </h2>
            {featured.description && (
              <p className="font-cormorant italic text-2xl text-luxury-champagne leading-relaxed max-w-md mb-8 line-clamp-3">
                {featured.description}
              </p>
            )}
            <div className="flex items-center gap-6">
              <Link
                to={`/product/${featured.id}`}
                className="btn-lux px-9 py-4 rounded-full text-[12px] font-medium label uppercase"
              >
                Discover
              </Link>
              <span className="text-[12px] label uppercase tracking-[0.25em]">
                <span className="text-luxury-gold2">01</span>
                <span className="text-luxury-mut"> / {String(total).padStart(2, "0")}</span>
              </span>
            </div>
          </div>

          <div
            className="relative rounded-3xl aspect-[4/3] glass overflow-hidden flex items-center justify-center"
            style={{ background: "radial-gradient(120% 100% at 50% 25%,#16213f,#0a1124 55%,#070B14)" }}
          >
            <div
              className="absolute w-80 h-80 rounded-full"
              style={{ background: "radial-gradient(circle,rgba(212,175,55,0.22),transparent 62%)" }}
            />
            {heroImg(featured) && (
              <img
                src={heroImg(featured)}
                alt={featured.name}
                className="relative max-h-[80%] max-w-[88%] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)]"
              />
            )}
          </div>
        </section>

        {/* All releases — coverflow (desktop) */}
        <section className="hidden md:block">
          <div className="flex items-center gap-6 mb-8">
            <span className="font-serif text-3xl text-white">All Releases</span>
            <div className="flex-1 rule" />
          </div>

          <div className="relative">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(212,175,55,0.16),transparent 60%)" }}
            />
            <Swiper
              modules={[Autoplay, Pagination, EffectCoverflow]}
              effect="coverflow"
              grabCursor
              centeredSlides
              loop={products.length > 2}
              slidesPerView="auto"
              spaceBetween={24}
              coverflowEffect={{ rotate: 24, stretch: 0, depth: 200, modifier: 1, slideShadows: false }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
              className="releases-swiper w-full !py-4"
            >
              {products.map((p) => (
                <SwiperSlide key={p.id} className="!w-72 lg:!w-80">
                  <Link to={`/product/${p.id}`}>
                    <div
                      className="rel-card relative rounded-3xl overflow-hidden border h-[26rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
                      style={{ background: "radial-gradient(120% 100% at 50% 25%,#16213f,#0a1124 55%,#070B14)" }}
                    >
                      {slideImg(p) ? (
                        <img src={slideImg(p)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-luxury-mut">{p.name}</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                        {p.category && (
                          <p className="label uppercase text-[10px] text-luxury-gold2 mb-1">
                            {String(p.category).trim()}
                          </p>
                        )}
                        <h3 className="font-serif text-2xl text-white line-clamp-1">{p.name}</h3>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* counter + progress */}
            <div className="max-w-sm mx-auto mt-6 flex items-center gap-4">
              <span className="text-[11px] label uppercase text-luxury-mut whitespace-nowrap">
                <span className="text-luxury-gold2">{String(activeIndex + 1).padStart(2, "0")}</span> /{" "}
                {String(total).padStart(2, "0")}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-luxury-gold to-luxury-gold2 transition-all duration-500"
                  style={{ width: `${((activeIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile list */}
        <section className="md:hidden">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-serif text-2xl text-white">All Releases</span>
            <div className="flex-1 rule" />
          </div>
          <div className="flex flex-col gap-5">
            {products.map((p, i) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className="card relative block rounded-2xl overflow-hidden glass"
              >
                <div className="relative aspect-[4/3] bg-luxury-panel2">
                  {slideImg(p) ? (
                    <img src={slideImg(p)} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                  {i === 0 && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] label uppercase bg-luxury-bg/80 border border-luxury-gold/40 text-luxury-gold2">
                      New
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    {p.category && (
                      <p className="label uppercase text-[10px] text-luxury-gold2 mb-0.5">
                        {String(p.category).trim()}
                      </p>
                    )}
                    <h2 className="font-serif text-xl text-white line-clamp-1">{p.name}</h2>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
