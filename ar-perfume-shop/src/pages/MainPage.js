import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IoSearchOutline } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import http from "../lib/http";

const MainPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // fetch products
  useEffect(() => {
    http
      .get("products/")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  // fetch profile if logged in
  useEffect(() => {
    http
      .get("me/")
      .then((res) => setProfile(res.data))
      .catch(() => {
        setProfile(null);
        setIsGuest(true);
      });
  }, []);

  // ✅ Collect unique categories dynamically
  const categories = [
    "All",
    ...Array.from(
      new Set(
        products
          .map((p) => (p.category ? p.category.trim() : null))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b)),
  ];

  // ✅ Apply both category + search filter
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === "All" ||
      (p.category || "").toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-2xl py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-white font-extrabold leading-tight text-3xl md:text-4xl lg:text-5xl">
            WELCOME
            <br />
            {profile ? (
              <Link to="/account" className="hover:underline text-sky-400">
                {profile.username}
              </Link>
            ) : (
              <span className="text-sky-400">
                {isGuest ? "Guest" : "Loading..."}
              </span>
            )}
          </h1>

          <Link
            to={profile ? "/account" : "/login"}
            className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-white/80"
            aria-label="Account"
          >
            <img
              src={profile?.avatar || "https://i.pravatar.cc/200?u=guest"}
              alt="User"
              className="w-full h-full object-cover"
            />
          </Link>
        </header>

        {/* ✅ Search */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 md:h-16 pl-14 pr-4 text-lg md:text-xl text-blue-900 bg-white/95 rounded-2xl outline-none focus:ring-4 focus:ring-sky-500/30"
          />
          <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 md:w-8 md:h-8 text-gray-400" />
        </div>

        {/* Hero slider */}
        <div className="mb-10">
          <Swiper
            modules={[Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            pagination={{ clickable: true }}
            className="w-full"
          >
            {products.map((product) => {
              const heroSrc =
                product.promo_image ||
                product.card_image ||
                product.media_gallery?.[0]?.file;

              return (
                <SwiperSlide key={product.id}>
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black/20 aspect-[16/9] md:aspect-[21/9]">
                      {heroSrc ? (
                        <img
                          src={heroSrc}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          No Promo Image
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <h3 className="absolute bottom-4 left-5 text-white text-2xl md:text-3xl font-bold drop-shadow">
                        {product.name}
                      </h3>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Category Filters */}
        <div className="mb-6">
          <h2 className="text-white text-2xl md:text-3xl font-semibold mb-3">
            Category
          </h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-xl font-semibold text-lg ${
                  activeCategory === cat
                    ? "bg-white text-blue-900"
                    : "bg-blue-800 text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-white/70">
              No products found.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="h-full">
                <div className="h-full bg-white/10 p-4 rounded-2xl backdrop-blur-sm hover:bg-white/15 transition flex flex-col">
                  <div className="w-full rounded-xl mb-4 overflow-hidden bg-black/10 aspect-[4/5] flex items-center justify-center">
                    {product.card_image ? (
                      <img
                        src={product.card_image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        No Card Image
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl md:text-2xl">
                    {product.name}
                  </h3>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
