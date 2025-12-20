// src/pages/ShopPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";
import PageHeader from "../components/PageHeader";
import { useCart } from "../context/CartContext";
import {
  IoBagHandleOutline,
  IoSwapHorizontalOutline,
  IoChevronForward,
  IoSparklesOutline,
  IoFilterOutline,
  IoCloseOutline,
} from "react-icons/io5";

const MAX_PRIMARY_CATEGORIES = 5;

const ShopPage = () => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { itemCount } = useCart();

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

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => p.category && set.add(String(p.category).trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const genderFilters = [
    { label: "Men", value: "MEN" },
    { label: "Women", value: "WOMEN" },
    { label: "Unisex", value: "UNISEX" },
  ];

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleGender = (value) => {
    setSelectedGenders((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedGenders([]);
  };

  const hasAnyFilter = selectedCategories.length > 0 || selectedGenders.length > 0;

  const overflowHasActive = categories.some(
    (cat, i) => i >= MAX_PRIMARY_CATEGORIES && selectedCategories.includes(cat)
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryActive = selectedCategories.length > 0;
      const genderActive = selectedGenders.length > 0;

      const productCategory = String(product.category || "").trim();
      const matchesCategory = !categoryActive || selectedCategories.includes(productCategory);

      const target = String(product.target || "").toUpperCase();
      const matchesGender = !genderActive || selectedGenders.includes(target);

      return matchesCategory && matchesGender;
    });
  }, [products, selectedCategories, selectedGenders]);

  // Ratings
  const getRatingAvg = (p) => {
    const v =
      p?.rating_avg ??
      p?.avg_rating ??
      p?.average_rating ??
      p?.ratingAverage ??
      0;
    return Number(v) || 0;
  };

  const renderStars = (avg = 0) => {
    const rounded = Math.round(Number(avg) || 0);
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i} className={i < rounded ? "text-luxury-gold" : "text-white/25"}>
          ★
        </span>
      ));
  };

  // Quick tools (remove Cart; keep Compare + Quiz)
  const quickTools = [
    {
      to: "/compare",
      icon: IoSwapHorizontalOutline,
      label: "Compare",
      accent: "border-sky-500/30 hover:border-sky-300/60",
      iconBg: "bg-sky-400/10",
      iconBorder: "border-sky-400/25",
    },
    {
      to: "/quiz",
      icon: IoSparklesOutline,
      label: "Find Your Scent",
      accent: "border-pink-500/30 hover:border-pink-300/60",
      iconBg: "bg-pink-400/10",
      iconBorder: "border-pink-400/25",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1a3a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 border-2 border-sky-300/80 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1a3a]">
      {/* Decorative background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[620px] h-[620px] bg-sky-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-pink-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-screen-2xl py-6 text-[18px] md:text-[19px] lg:text-[20px]">
          {/* Top bar: cart icon on the right (md+ double size) */}
          <PageHeader
            title="SHOP"
            right={
              <Link
                to="/cart"
                aria-label="Cart"
                className="
                  relative inline-flex items-center justify-center
                  w-10 h-10 md:w-20 md:h-20
                  rounded-full bg-white/5 border border-white/10
                  hover:bg-white/10 transition
                "
              >
                <IoBagHandleOutline className="text-white/90 text-[22px] md:text-[44px]" />
                {itemCount > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      min-w-[18px] h-[18px] px-1
                      md:min-w-[24px] md:h-[24px] md:text-[12px]
                      rounded-full bg-luxury-gold text-[#0c1a3a]
                      text-[11px] font-extrabold grid place-items-center shadow
                    "
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            }
          />

          {/* Products first */}
          <div className="flex items-center justify-between mb-3 mt-4">
            <p className="text-white/60 text-sm">
              Showing{" "}
              <span className="text-sky-200 font-semibold">{filteredProducts.length}</span>{" "}
              fragrances
            </p>

            {hasAnyFilter && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition"
              >
                <IoCloseOutline />
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <IoFilterOutline className="text-sky-200 text-xl" />
              <h2 className="text-white font-semibold tracking-wide">Filters</h2>
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 md:overflow-x-auto md:whitespace-nowrap pb-2 md:pb-4 md:scrollbar-thin md:scrollbar-thumb-slate-600/70 text-[14px] sm:text-[15px] font-semibold">
              <button
                onClick={clearAll}
                className={`px-4 py-2 md:px-7 md:py-3 rounded-full border-2 transition-all duration-200 shadow-sm
                  ${
                    !hasAnyFilter
                      ? "bg-white text-blue-900 border-white shadow-white/40"
                      : "bg-transparent text-sky-200 border-sky-500/50 hover:bg-sky-500/20 hover:text-white"
                  }`}
              >
                All
              </button>

              {categories.slice(0, MAX_PRIMARY_CATEGORIES).map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={`cat-${cat}`}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2 md:px-7 md:py-3 rounded-full border-2 transition-all duration-200 shadow-sm
                      ${
                        active
                          ? "bg-sky-400 text-blue-900 border-sky-300 shadow-sky-400/40"
                          : "bg-transparent text-sky-200 border-sky-500/50 hover:bg-sky-500/20 hover:text-white"
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
                    className={`px-4 py-2 md:px-7 md:py-3 rounded-full border-2 transition-all duration-200 shadow-sm
                      ${
                        active
                          ? "bg-pink-400 text-blue-900 border-pink-300 shadow-pink-400/40"
                          : "bg-transparent text-pink-200 border-pink-500/50 hover:bg-pink-500/20 hover:text-white"
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
                      className={`list-none px-4 py-2 md:px-7 md:py-3 rounded-full border-2 cursor-pointer select-none transition-all duration-200 shadow-sm
                        ${
                          overflowHasActive
                            ? "bg-sky-400 text-blue-900 border-sky-300 shadow-sky-400/40"
                            : "bg-transparent text-sky-200 border-sky-500/50 group-hover:bg-sky-500/20 group-hover:text-white"
                        }`}
                    >
                      More
                    </summary>

                    <div className="absolute mt-2 right-0 min-w-[200px] bg-[#071426] border border-sky-500/40 rounded-2xl p-2 z-30 shadow-2xl">
                      {categories.slice(MAX_PRIMARY_CATEGORIES).map((cat) => {
                        const active = selectedCategories.includes(cat);
                        return (
                          <button
                            key={`more-${cat}`}
                            onClick={() => toggleCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition
                              ${
                                active
                                  ? "bg-sky-500/90 text-blue-950 font-semibold"
                                  : "bg-transparent text-sky-100 hover:bg-sky-500/20"
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

          {/* Products grid */}
          <AnimatePresence mode="popLayout">
            {filteredProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <p className="text-white/60 text-lg">No products found for this filter.</p>
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6 auto-rows-fr"
              >
                {filteredProducts.map((product, idx) => {
                  const avg = getRatingAvg(product);

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <Link to={`/product/${product.id}`} className="block h-full group">
                        <div className="relative h-full rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br from-white/10 to-white/5 hover:border-sky-300/40 transition-all duration-500">
                          {/* Image */}
                          <div className="aspect-[4/5] p-2 sm:p-3 md:p-4 flex items-center justify-center bg-gradient-to-b from-transparent to-black/20">
                            <motion.img
                              src={
                                product.card_image ||
                                product.promo_image ||
                                product.media_gallery?.[0]?.file ||
                                "/placeholder.png"
                              }
                              alt={product.name}
                              className="w-full h-full object-contain group-hover:scale-[1.06] transition-transform duration-700"
                              loading="lazy"
                            />
                          </div>

                          {/* Info
                              IMPORTANT FIX for your "dark blue cutting" issue:
                              - remove bg-gradient-to-t block background here
                              - keep it transparent + consistent padding
                          */}
                          <div className="relative p-3 sm:p-4 flex flex-col gap-2 min-w-0">
                            {/* Category */}
                            {product.category && (
                              <span className="inline-block px-2.5 py-1 text-[10px] uppercase tracking-wider text-luxury-gold bg-luxury-panel/60 rounded-full border border-luxury-gold/25 w-fit">
                                {String(product.category).trim()}
                              </span>
                            )}

                            <h3 className="text-white font-bold text-[13px] sm:text-[14px] md:text-base leading-snug line-clamp-2 group-hover:text-sky-200 transition-colors">
                              {product.name}
                            </h3>

                            {/* Target */}
                            {product.target && (
                              <span className="inline-block px-3 py-1 rounded-full text-[9px] bg-blue-900/70 text-sky-300 uppercase tracking-wide w-fit">
                                {String(product.target).toUpperCase() === "MEN"
                                  ? "For Men"
                                  : String(product.target).toUpperCase() === "WOMEN"
                                  ? "For Women"
                                  : "Unisex"}
                              </span>
                            )}

                            {/* ✅ Rating: stars only (no digits) */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex text-base leading-none flex-none">
                                {renderStars(avg)}
                              </div>
                            </div>

                            {/* Price row */}
                            <div className="flex items-center justify-between gap-3 mt-1">
                              <p className="text-white font-extrabold text-lg sm:text-xl leading-none">
                                RM {product.price}
                              </p>

                              <div className="flex-none w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                                <IoChevronForward className="text-white group-hover:text-blue-900 text-xl transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick tools (no cart) */}
          <div className="mt-10 pb-10">
            <h3 className="text-white/80 font-semibold tracking-wide mb-3">Quick tools</h3>

            {/* Mobile: icons only */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {quickTools.map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`relative rounded-2xl border bg-white/5 ${tool.accent} transition-all duration-300 overflow-hidden`}
                  aria-label={tool.label}
                >
                  <div className="p-4 flex items-center justify-center">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tool.iconBg} border ${tool.iconBorder}`}
                    >
                      <tool.icon className="text-[24px] text-white/90" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: full with labels */}
            <div className="hidden md:grid grid-cols-2 gap-4">
              {quickTools.map((tool, idx) => (
                <motion.div
                  key={tool.to}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                >
                  <Link
                    to={tool.to}
                    className={`block rounded-2xl border bg-gradient-to-br from-white/10 to-white/5 ${tool.accent}
                      transition-all duration-300 overflow-hidden`}
                  >
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${tool.iconBg} border ${tool.iconBorder}`}
                        >
                          <tool.icon className="text-[22px] text-white/90" />
                        </div>
                        <p className="text-white/90 font-semibold tracking-wide">{tool.label}</p>
                      </div>

                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <IoChevronForward className="text-white/70 text-xl" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
