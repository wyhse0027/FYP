import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { IoSearchOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";
import { Card, Chip, Input, Badge, Skeleton, SectionLabel } from "../components/ui";

const MAX_PRIMARY_CATEGORIES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Skeleton compositions ---------------- */
function HeroSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-gold">
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-white/5">
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-12">
          <Skeleton className="h-px w-12 mb-3 md:mb-4" />
          <Skeleton className="h-8 md:h-10 w-[65%] mb-3" />
          <Skeleton className="h-4 w-[40%]" />
        </div>
      </div>
    </div>
  );
}

function PillsSkeleton() {
  return (
    <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 md:overflow-x-auto whitespace-normal md:whitespace-nowrap pb-3 md:pb-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-10 md:h-12 w-24 md:w-28 rounded-full" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-full bg-white/[0.04] border border-luxury-gold/10 rounded-2xl p-3 sm:p-4 md:p-6"
        >
          <Skeleton className="w-full aspect-[4/5] md:aspect-[3/4] mb-3 md:mb-5" />
          <Skeleton className="h-5 md:h-6 w-[80%] mb-3" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Motion variants ---------------- */
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
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
      setShowHeader(true);
      await sleep(120);
      if (!alive) return;

      setShowSearch(true);
      await sleep(120);
      if (!alive) return;

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
    { label: "Men", value: "MEN" },
    { label: "Women", value: "WOMEN" },
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

  const loading = loadingProducts;

  const targetLabel = (t) =>
    t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : "Unisex";

  return (
    <div className="min-h-screen w-full bg-luxury-bg px-4 sm:px-6 md:px-12 lg:px-16">
      {/* Gold radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-gold-radial opacity-70" style={{ "--x": "50%", "--y": "0%" }} />

      <div className="relative z-10 mx-auto w-full max-w-screen-2xl py-6 sm:py-8">
        {/* ─── Header ─────────────────────────────────── */}
        <AnimatePresence>
          {showHeader && (
            <motion.header
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex items-center justify-between mb-6 sm:mb-8 md:mb-10 pb-4 sm:pb-5 md:pb-6 border-b border-white/10"
            >
              <div className="min-w-0">
                <SectionLabel className="mb-2">Welcome Back</SectionLabel>

                {loadingProfile ? (
                  <Skeleton className="h-8 sm:h-9 md:h-10 w-40 sm:w-44 md:w-48" />
                ) : profile ? (
                  <Link to="/account" className="group inline-flex items-center gap-2 min-w-0">
                    <span className="text-luxury-champagne text-3xl sm:text-4xl md:text-5xl font-serif font-medium tracking-wide group-hover:text-luxury-gold2 transition-colors truncate max-w-[220px] sm:max-w-[320px] md:max-w-none">
                      {profile.username}
                    </span>
                  </Link>
                ) : (
                  <span className="text-luxury-champagne text-3xl sm:text-4xl md:text-5xl font-serif font-medium tracking-wide">
                    {isGuest ? "Guest" : "..."}
                  </span>
                )}
              </div>

              <Link
                to={profile ? "/account" : "/login"}
                className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-24 md:h-24 rounded-full overflow-hidden ring-1 ring-luxury-gold/40 hover:ring-luxury-gold/80 transition-all duration-300 hover:scale-105 flex-none"
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
              className="relative mb-8 sm:mb-10 md:mb-12"
            >
              <div className="relative max-w-2xl mx-auto">
                <Input
                  type="text"
                  placeholder="Search fragrance, note, or mood…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<IoSearchOutline className="w-5 h-5 md:w-6 md:h-6" />}
                  className="md:h-16"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Hero (editorial split, featured fragrance) ─ */}
        <div className="mb-10 sm:mb-12 md:mb-14">
          {loading || !showHero || !heroProducts[0] ? (
            <HeroSkeleton />
          ) : (
            (() => {
              const f = heroProducts[0];
              const img = f.promo_image || f.card_image || f.media_gallery?.[0]?.file;
              return (
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="show"
                  className="relative overflow-hidden rounded-3xl border border-luxury-gold/15 bg-white/[0.04] backdrop-blur-md shadow-gold"
                >
                  <div className="grid md:grid-cols-2 items-center">
                    <div className="p-8 sm:p-12 md:p-14 order-2 md:order-1">
                      <SectionLabel className="mb-5">
                        {(f.category || "Signature")}
                        {f.target ? ` · ${targetLabel(f.target)}` : ""}
                      </SectionLabel>
                      <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05] font-medium text-white mb-5">
                        {f.name}
                      </h2>
                      <div className="w-12 h-px bg-luxury-gold mb-5" />
                      <p className="font-cormorant text-xl sm:text-2xl text-luxury-champagne/75 max-w-md mb-8 line-clamp-4">
                        {f.description || "An olfactory signature, composed to be remembered."}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Link
                          to={`/product/${f.id}`}
                          className="btn-lux px-8 py-3 rounded-full text-sm font-medium uppercase tracking-[0.3em]"
                        >
                          Discover
                        </Link>
                        <Link
                          to={`/product/${f.id}`}
                          className="px-8 py-3 rounded-full text-sm font-medium uppercase tracking-[0.3em] text-luxury-champagne border border-luxury-gold/40 hover:border-luxury-gold hover:bg-luxury-gold/10 transition inline-flex items-center gap-2"
                        >
                          View Fragrance
                        </Link>
                      </div>
                    </div>
                    <div
                      className="relative h-64 sm:h-80 md:h-[28rem] flex items-center justify-center overflow-hidden order-1 md:order-2"
                      style={{ background: "radial-gradient(120% 100% at 50% 20%,#16213f,#0a1124 55%,#070B14)" }}
                    >
                      <div
                        className="absolute w-72 h-72 rounded-full"
                        style={{ background: "radial-gradient(circle,rgba(212,175,55,0.18),transparent 65%)" }}
                      />
                      {img ? (
                        <img
                          src={img}
                          alt={f.name}
                          className="relative max-h-[82%] max-w-[80%] object-contain drop-shadow-2xl"
                        />
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })()
          )}
        </div>

        {/* ─── Filter chips (persistent gold state) ───── */}
        <div className="mb-8 sm:mb-9 md:mb-10">
          {loading || !showFilters ? (
            <PillsSkeleton />
          ) : (
            <motion.div variants={sectionVariants} initial="hidden" animate="show">
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 md:overflow-x-auto whitespace-normal md:whitespace-nowrap pb-3 md:pb-4">
                <Chip active={!hasAnyFilter} onClick={clearAll}>
                  All
                </Chip>

                {categories.slice(0, MAX_PRIMARY_CATEGORIES).map((cat) => (
                  <Chip
                    key={`cat-${cat}`}
                    active={selectedCategories.includes(cat)}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Chip>
                ))}

                <span className="hidden md:inline-block w-px h-5 bg-white/15 mx-1" />

                {genderFilters.map((g) => (
                  <Chip
                    key={`gender-${g.value}`}
                    active={selectedGenders.includes(g.value)}
                    onClick={() => toggleGender(g.value)}
                  >
                    {g.label}
                  </Chip>
                ))}

                {categories.length > MAX_PRIMARY_CATEGORIES && (
                  <div className="relative inline-block">
                    <details className="group">
                      <summary
                        className={`list-none px-6 py-2.5 rounded-full border cursor-pointer select-none transition-all duration-300 uppercase text-xs tracking-[0.3em]
                          ${
                            overflowHasActive
                              ? "bg-luxury-gold/15 text-luxury-champagne border-luxury-gold/70"
                              : "bg-transparent text-white/65 border-white/15 group-hover:border-luxury-gold/50"
                          }`}
                      >
                        More
                      </summary>
                      <div className="absolute mt-3 right-0 min-w-[220px] bg-luxury-panel2/95 backdrop-blur-xl border border-luxury-gold/15 rounded-2xl p-3 z-30 shadow-gold">
                        {categories.slice(MAX_PRIMARY_CATEGORIES).map((cat) => {
                          const active = selectedCategories.includes(cat);
                          return (
                            <button
                              key={`more-${cat}`}
                              onClick={() => toggleCategory(cat)}
                              className={`w-full text-left px-4 py-3 rounded-xl text-xs md:text-sm mb-2 transition-all duration-200 uppercase tracking-[0.2em]
                                ${
                                  active
                                    ? "bg-luxury-gold/20 text-luxury-champagne"
                                    : "bg-transparent text-white/70 hover:bg-white/10"
                                }`}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-8">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12 md:py-16">
                  <p className="text-luxury-champagne/70 font-serif text-xl md:text-2xl">
                    No fragrances found for this selection.
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const img =
                    product.card_image ||
                    product.promo_image ||
                    product.media_gallery?.[0]?.file;
                  return (
                    <motion.div key={product.id} variants={cardVariants} className="h-full">
                      <Link to={`/product/${product.id}`} className="group h-full block">
                        <Card className="h-full p-3 sm:p-4 md:p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-luxury-gold/55 hover:shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col">
                          <div className="w-full rounded-xl mb-3 md:mb-5 overflow-hidden bg-black/20 aspect-[4/5] md:aspect-[3/4] flex items-center justify-center relative">
                            {img ? (
                              <img
                                src={img}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-luxury-panel2 to-luxury-bg flex items-center justify-center text-white/30 text-sm">
                                No Image
                              </div>
                            )}

                            {product.target && (
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-luxury-bg/80 !text-white/70 !border-white/10 !tracking-[0.2em]">
                                  {targetLabel(product.target)}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col min-w-0">
                            <h3 className="text-white font-serif font-medium text-base sm:text-lg md:text-xl mb-1.5 tracking-wide line-clamp-2">
                              {product.name}
                            </h3>

                            {product.category ? (
                              <p className="text-luxury-gold/90 text-[10px] sm:text-[11px] md:text-xs tracking-[0.3em] uppercase line-clamp-1">
                                {String(product.category).trim()}
                              </p>
                            ) : null}

                            {product.price != null && (
                              <p className="mt-2 font-serif text-lg md:text-xl text-luxury-champagne/85">
                                RM {product.price}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
