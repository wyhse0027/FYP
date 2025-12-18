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
        const items = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];
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
      {/* Top Header */}
      <div className="relative w-full flex items-center justify-center py-6 bg-[#0c1a3a] border-b border-white/10">
        <Link
          to="/"
          className="absolute left-6 md:left-12 text-white hover:text-blue-400 text-3xl transition"
        >
          ❮
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-white">
          GERAIN CHAN RELEASES
        </h1>
      </div>

      {/* Swiper slider (desktop + mobile) */}
      <div className="w-full max-w-[1600px] flex-1 flex items-center px-4 md:px-10 py-8 md:py-12">
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
            disableOnInteraction: false, // ✅ keeps auto-turn even after swipe
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
                />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-semibold">
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
  );
}
