// src/pages/ReleasesPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectCoverflow } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";

export default function ReleasesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get("products/")
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProducts(items);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0c1a3a] flex items-center justify-center">
        <p className="text-white text-center">Loading releases...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="min-h-screen w-full bg-[#0c1a3a] flex items-center justify-center">
        <p className="text-white text-center">No releases found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] text-white flex flex-col items-center">
      {/* Top Header (fixed overlap: 3-column layout) */}
      <div className="w-full border-b border-white/10 bg-[#0c1a3a]">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-10 py-4 md:py-6">
          <div className="grid grid-cols-[44px_1fr_44px] items-center">
            <Link
              to="/"
              aria-label="Back"
              className="h-10 w-10 grid place-items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <span className="text-2xl leading-none">‹</span>
            </Link>

            <h1 className="text-center text-lg sm:text-xl md:text-3xl font-extrabold uppercase tracking-wide text-white truncate px-2">
              GERAIN CHAN RELEASES
            </h1>

            {/* spacer keeps title perfectly centered */}
            <div className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-[1600px] flex-1 px-4 md:px-10 py-6 md:py-12">
        {/* ✅ MOBILE: vertical listings */}
        <div className="md:hidden flex flex-col gap-5">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="block rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl"
            >
              <div className="relative w-full">
                <img
                  src={p.promo_image}
                  alt={p.name}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h2 className="text-lg font-semibold line-clamp-1">{p.name}</h2>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ✅ PC (md+): keep your current Swiper design */}
        <div className="hidden md:flex items-center">
          <Swiper
            modules={[Autoplay, Pagination, EffectCoverflow]}
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            loop={true}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 1 },
              1024: { slidesPerView: 1 },
            }}
            coverflowEffect={{
              rotate: 25,
              stretch: 0,
              depth: 250,
              modifier: 1,
              slideShadows: true,
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
            className="w-full"
          >
            {products.map((p) => (
              <SwiperSlide key={p.id}>
                <Link to={`/product/${p.id}`}>
                  <div className="relative w-full flex justify-center">
                    <img
                      src={p.promo_image}
                      alt={p.name}
                      className="
                        max-w-full
                        w-auto
                        max-h-[80vh]
                        object-contain
                        rounded-2xl
                        shadow-2xl
                        border border-white/10
                      "
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6">
                      <h2 className="text-xl md:text-2xl font-semibold line-clamp-1">
                        {p.name}
                      </h2>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
