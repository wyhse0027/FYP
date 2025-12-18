import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { IoSearchOutline } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, EffectFade } from "swiper/modules";
import { motion, AnimatePresence } from "framer-motion";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import http from "../lib/http";

const MAX_PRIMARY_CATEGORIES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Skeleton bits ---------------- */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className}`} />;
}

function HeroSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <Skeleton className="h-px w-12 bg-white/20 rounded-none mb-4" />
          <Skeleton className="h-10 w-[60%] mb-3" />
          <Skeleton className="h-4 w-[35%]" />
        </div>
      </div>
    </div>
  );
}

function PillsSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto whitespace-nowrap pb-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-28 rounded-full flex-none" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-full bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6"
        >
          <Skeleton className="w-full aspect-[3/4] rounded-xl mb-5" />
          <Skeleton className="h-6 w-[80%] mb-3" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Motion variants ---------------- */
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const gridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function MainPage() {
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // staged reveal flags
  const [showHeader, setShowHeader] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHero, setShowHero] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // ─── Fetch products ────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoadingProducts(true);

    http
      .get("products/")
      .then((res) => {
        if (!alive) return;
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProducts(items);
      })
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => alive && setLoadingProducts(false));

    return () => {
      alive = false;
    };
  }, []);

  // ─── Fetch profile ─────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoadingProfile(true);

    http
      .get("me/")
      .then((res) => alive && setProfile(res.data))
      .catch(() => {
        if (!alive) return;
        setProfile(null);
        setIsGuest(true);
      })
      .finally(() => alive && setLoadingProfile(false));

    return () => {
      alive = false;
    };
  }, []);

  // ─── Staged reveal (smooth order) ──────────────────
  useEffect(() => {
    let alive = true;

    async function run() {
      // show header immediately
      setShowHeader(true);
      await sleep(120);
      if (!alive) return;

      setShowSearch(true);
      await sleep(120);
      if (!alive) return;

      // hero & filters depend on products to exist
      if (!loadingProducts) {
        setShowHero(true);
        await sleep(120);
        if (!alive) return;

        setShowFilters(true);
        await sleep(120);
        if (!alive) return;

        setShowGrid(true);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [loadingProducts]);

  // ─── Derived lists ─────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const genderFilters = [
    { label: "For Men", value: "MEN" },
    { label: "For Women", value: "WOMEN" },
    { label: "Unisex", value: "UNISEX" },
  ];

  const hasAnyFilter = selectedCategories.length > 0 || selectedGenders.length > 0;

  // ─── Filter helpers ────────────────────────────────
  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedGenders([]);
  };

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleGender = (value) => {
    setSelectedGenders((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // ─── Apply filters ─────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const cat = (p.category || "").trim();
    const target = (p.target || "").toUpperCase();

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(cat);
    const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(target);

    const needle = searchTerm.toLowerCase();
    const matchesSearch =
      !needle ||
      (p.name || "").toLowerCase().includes(needle) ||
      (p.description || "").toLowerCase().includes(needle);

    return matchesCategory && matchesGender && matchesSearch;
  });

  const heroProducts = products;

  const overflowHasActive = categories.some(
    (cat, i) => i >= MAX_PRIMARY_CATEGORIES && selectedCategories.includes(cat)
  );

  const loading = loadingProducts; // main content loading gate

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a1628] via-[#0c1a3a] to-[#0e1f4a] px-6 md:px-12 lg:px-16">
      {/* Very subtle star / grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.8\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-screen-2xl py-8">
        {/* ─── Header ─────────────────────────────────── */}
        <AnimatePresence>
          {showHeader && (
            <motion.header
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex items-center justify-between mb-10 pb-6 border-b border-white/10"
            >
              <div>
                <p className="text-white/60 tracking-[0.2em] text-xs md:text-sm uppercase mb-2">
                  Welcome Back
                </p>

                {loadingProfile ? (
                  <Skeleton className="h-10 w-48" />
                ) : profile ? (
                  <Link to="/account" className="group inline-flex items-center gap-2">
                    <span className="text-yellow-400 text-3xl md:text-4xl font-serif font-light tracking-wide group-hover:text-yellow-300 transition-colors">
                      {profile.username}
                    </span>
                  </Link>
                ) : (
                  <span className="text-slate-200 text-3xl md:text-4xl font-serif font-light tracking-wide">
                    {isGuest ? "Guest" : "..."}
                  </span>
                )}
              </div>

              <Link
                to={profile ? "/account" : "/login"}
                className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-yellow-400/40 hover:ring-yellow-300/80 transition-all duration-300 hover:scale-105"
                aria-label="Account"
              >
                {loadingProfile ? (
                  <div className="w-full h-full bg-white/10 animate-pulse" />
                ) : (
                  <img
                    src={profile?.avatar || "https://i.pravatar.cc/200?u=guest"}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                )}
              </Link>
            </motion.header>
          )}
        </AnimatePresence>

        {/* ─── Search ─────────────────────────────────── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="relative mb-12"
            >
              <div className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder="Search for your signature scent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-16 md:h-18 pl-16 pr-6 text-lg text-white bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 outline-none focus:border-yellow-400/70 focus:bg-white/10 transition-all duration-300 placeholder:text-white/40"
                />
                <IoSearchOutline className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-yellow-300/70" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Hero Slider ────────────────────────────── */}
        <div className="mb-14">
          {loading || !showHero ? (
            <HeroSkeleton />
          ) : (
            <motion.div variants={sectionVariants} initial="hidden" animate="show">
              <Swiper
                modules={[Pagination, Autoplay, EffectFade]}
                effect="fade"
                spaceBetween={0}
                slidesPerView={1}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                className="w-full rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              >
                {heroProducts.map((product) => {
                  const heroSrc =
                    product.promo_image ||
                    product.card_image ||
                    product.media_gallery?.[0]?.file;

                  return (
                    <SwiperSlide key={product.id}>
                      <Link to={`/product/${product.id}`} className="block group">
                        <div className="relative w-full bg-gradient-to-br from-[#1a2847] to-[#0f1e3d] aspect-[16/9] md:aspect-[21/9] overflow-hidden">
                          {heroSrc ? (
                            <img
                              src={heroSrc}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white/30 text-xl">
                              No Promo Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                            <div className="max-w-2xl">
                              <div className="w-12 h-px bg-yellow-400 mb-4" />
                              <h3 className="text-white text-3xl md:text-5xl font-serif font-light tracking-wide mb-2 drop-shadow-lg">
                                {product.name}
                              </h3>
                              {product.category && (
                                <p className="text-slate-200 text-xs md:text-sm tracking-[0.25em] uppercase">
                                  {product.category}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </motion.div>
          )}
        </div>

        {/* ─── Filter pills ───────────────────────────── */}
        <div className="mb-10">
          {loading || !showFilters ? (
            <PillsSkeleton />
          ) : (
            <motion.div variants={sectionVariants} initial="hidden" animate="show">
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-4 scrollbar-thin scrollbar-thumb-white/20 text-sm font-medium tracking-wider">
                <button
                  onClick={clearAll}
                  className={`px-8 py-3 rounded-full border transition-all duration-300 
                    ${
                      !hasAnyFilter
                        ? "bg-yellow-400 text-[#0a1628] border-yellow-400 shadow-lg shadow-yellow-400/25"
                        : "bg-white/5 text-slate-200 border-white/20 hover:bg-white/10 hover:border-yellow-300/60"
                    }`}
                >
                  ALL
                </button>

                {categories.slice(0, MAX_PRIMARY_CATEGORIES).map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={`cat-${cat}`}
                      onClick={() => toggleCategory(cat)}
                      className={`px-8 py-3 rounded-full border transition-all duration-300 uppercase
                        ${
                          active
                            ? "bg-cyan-400/20 text-white border-cyan-300 shadow-lg shadow-cyan-400/30"
                            : "bg-white/5 text-slate-200 border-white/20 hover:bg-white/10 hover:border-cyan-300/60"
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}

                {genderFilters.map((g) => {
                  const active = selectedGenders.includes(g.value);
                  return (
                    <button
                      key={`gender-${g.value}`}
                      onClick={() => toggleGender(g.value)}
                      className={`px-8 py-3 rounded-full border transition-all duration-300 uppercase
                        ${
                          active
                            ? "bg-pink-400/20 text-white border-pink-300 shadow-lg shadow-pink-400/30"
                            : "bg-white/5 text-slate-200 border-white/20 hover:bg-white/10 hover:border-pink-300/60"
                        }`}
                    >
                      {g.label}
                    </button>
                  );
                })}

                {categories.length > MAX_PRIMARY_CATEGORIES && (
                  <div className="relative inline-block">
                    <details className="group">
                      <summary
                        className={`list-none px-8 py-3 rounded-full border cursor-pointer select-none transition-all duration-300 uppercase
                          ${
                            overflowHasActive
                              ? "bg-cyan-400/20 text-white border-cyan-300 shadow-lg shadow-cyan-400/30"
                              : "bg-white/5 text-slate-200 border-white/20 group-hover:bg-white/10 group-hover:border-yellow-300/60"
                          }`}
                      >
                        More
                      </summary>
                      <div className="absolute mt-3 right-0 min-w-[220px] bg-[#0f1e3d]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 z-30 shadow-2xl">
                        {categories.slice(MAX_PRIMARY_CATEGORIES).map((cat) => {
                          const active = selectedCategories.includes(cat);
                          return (
                            <button
                              key={`more-${cat}`}
                              onClick={() => toggleCategory(cat)}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm mb-2 transition-all duration-200 uppercase tracking-wider
                                ${active ? "bg-cyan-400/30 text-white" : "bg-transparent text-slate-200 hover:bg-white/10"}`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── Product Grid ───────────────────────────── */}
        {loading || !showGrid ? (
          <GridSkeleton />
        ) : (
          <motion.div variants={gridVariants} initial="hidden" animate="show">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-slate-200 text-lg">No fragrances found for this selection.</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <motion.div key={product.id} variants={cardVariants} className="h-full">
                    <Link to={`/product/${product.id}`} className="group h-full block">
                      <div className="h-full bg-gradient-to-br from-[rgba(15,31,61,0.7)] to-[rgba(7,15,35,0.9)] border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md transition-all duration-400 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_18px_45px_rgba(0,0,0,0.6)] flex flex-col">
                        <div className="w-full rounded-xl mb-5 overflow-hidden bg-black/20 aspect-[3/4] flex items-center justify-center relative">
                          {product.card_image || product.promo_image || product.media_gallery?.[0]?.file ? (
                            <img
                              src={product.card_image || product.promo_image || product.media_gallery?.[0]?.file}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white/30">
                              No Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/0 group-hover:via-white/5 transition-all duration-700" />
                        </div>

                        <div className="flex-1 flex flex-col">
                          <h3 className="text-white font-serif font-light text-lg md:text-xl mb-2 tracking-wide line-clamp-2">
                            {product.name}
                          </h3>

                          {product.target && (
                            <span className="inline-block px-3 py-1.5 rounded-full text-[10px] bg-[#111a33] text-slate-200 uppercase tracking-[0.18em] border border-white/10 w-fit">
                              {product.target === "MEN"
                                ? "For Men"
                                : product.target === "WOMEN"
                                ? "For Women"
                                : "Unisex"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
