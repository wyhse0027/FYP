import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";

export default function ReleasesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const startX = useRef(0);
  const endX = useRef(0);

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

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % products.length);
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);

  // --- Touch gesture handling ---
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    endX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = endX.current - startX.current;
    if (Math.abs(distance) > 80) {
      if (distance > 0) prevSlide();
      else nextSlide();
    }
    startX.current = 0;
    endX.current = 0;
  };

  if (loading)
    return <p className="text-white text-center mt-10">Loading releases...</p>;

  return (
    <div
      className="min-h-screen w-full bg-[#0c1a3a] text-white flex flex-col items-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* --- Top Header (Back Button + Centered Title) --- */}
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

      {/* --- DESKTOP FLEXIBLE FULLSCREEN CAROUSEL --- */}
      <div className="relative hidden md:flex justify-center items-center w-full h-screen mt-4 perspective-[3000px]">
        {/* Navigation arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-6 lg:left-12 z-30 text-5xl text-gray-300 hover:text-white transition"
        >
          ❮
        </button>

        <div className="relative flex justify-center items-center w-full h-full">
          {products.map((p, index) => {
            const total = products.length;
            const offset = (index - currentIndex + total) % total;
            const isActive = offset === 0;

            // spacing and depth (responsive)
            const sideOffset = window.innerWidth * 0.25;
            const depth = 300;

            // transform
            let transform = "";
            let opacity = 1;
            let zIndex = 1;
            let pointerEvents = "none";
            let scale = 0.85;

            if (isActive) {
              transform = "translateX(0px) translateZ(350px)";
              opacity = 1;
              scale = 1;
              zIndex = 20;
              pointerEvents = "auto";
            } else if (offset === 1 || offset === -total + 1) {
              transform = `translateX(${sideOffset}px) translateZ(${depth}px) rotateY(-10deg)`;
              opacity = 0.8;
              zIndex = 10;
            } else if (offset === total - 1 || offset === -1) {
              transform = `translateX(-${sideOffset}px) translateZ(${depth}px) rotateY(10deg)`;
              opacity = 0.8;
              zIndex = 10;
            } else {
              transform = "translateZ(-800px) scale(0.7)";
              opacity = 0;
              zIndex = 0;
            }

            return (
              <div
                key={p.id}
                className="absolute transition-all duration-700 ease-in-out transform-gpu"
                style={{
                  transform: `${transform} scale(${scale})`,
                  opacity,
                  zIndex,
                  pointerEvents,
                }}
              >
                {isActive ? (
                  <Link to={`/product/${p.id}`}>
                    <img
                      src={p.promo_image}
                      alt={p.name}
                      className="
                        w-[70vw]
                        h-[39vw]
                        object-cover
                        rounded-2xl
                        shadow-2xl
                        border border-white/10
                        max-w-[1600px]
                        max-h-[900px]
                      "
                    />
                  </Link>
                ) : (
                  <img
                    src={p.promo_image}
                    alt={p.name}
                    className="
                        w-[70vw]
                        h-[39vw]
                        object-cover
                        rounded-2xl
                        shadow-xl
                        border border-white/10
                        max-w-[1600px]
                        max-h-[900px]
                      "
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Next arrow */}
        <button
          onClick={nextSlide}
          className="absolute right-6 lg:right-12 z-30 text-5xl text-gray-300 hover:text-white transition"
        >
          ❯
        </button>
      </div>

      {/* --- MOBILE STACK VIEW (with swipe support) --- */}
      <div className="flex md:hidden flex-col gap-6 w-full px-5 py-6">
        {products.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`}>
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
              <img
                src={p.promo_image}
                alt={p.name}
                className="w-full h-[240px] sm:h-[300px] object-cover"
              />
              <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-lg font-semibold">{p.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
