// src/pages/ShopPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import http from "../lib/http";
import { Chip } from "../components/ui";

const MAX_PRIMARY_CATEGORIES = 5;

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : "Unisex";

const cardImg = (p) =>
  p?.card_image || p?.promo_image || p?.media_gallery?.[0]?.file || null;

const ShopPage = () => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");

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

  const toggleCategory = (cat) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const toggleGender = (value) =>
    setSelectedGenders((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedGenders([]);
  };

  const hasAnyFilter =
    selectedCategories.length > 0 || selectedGenders.length > 0;

  const overflowHasActive = categories.some(
    (cat, i) => i >= MAX_PRIMARY_CATEGORIES && selectedCategories.includes(cat)
  );

  const filteredProducts = useMemo(() => {
    const list = products.filter((product) => {
      const categoryActive = selectedCategories.length > 0;
      const genderActive = selectedGenders.length > 0;
      const productCategory = String(product.category || "").trim();
      const matchesCategory =
        !categoryActive || selectedCategories.includes(productCategory);
      const target = String(product.target || "").toUpperCase();
      const matchesGender = !genderActive || selectedGenders.includes(target);
      return matchesCategory && matchesGender;
    });

    const sorted = [...list];
    if (sort === "price-asc")
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price-desc")
      sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "name")
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return sorted;
  }, [products, selectedCategories, selectedGenders, sort]);

  return (
    <div className="relative">
      {/* Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.12),transparent 60%)",
        }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12 md:py-14">
        {/* Title */}
        <div className="text-center mb-9 md:mb-10">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">
            The Maison
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl text-white mb-3">Shop</h1>
          <p className="font-cormorant italic text-xl sm:text-2xl text-luxury-champagne/75">
            Each fragrance, a chapter of the house.
          </p>
        </div>

        {/* Filters + sort */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-9 md:mb-10">
          <div className="flex flex-wrap items-center gap-2.5 md:gap-3 text-xs label uppercase">
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

            {categories.length > MAX_PRIMARY_CATEGORIES && (
              <details className="group relative inline-block">
                <summary
                  className={`list-none px-6 py-2.5 rounded-full border cursor-pointer select-none transition-all duration-300 text-xs label uppercase
                    ${
                      overflowHasActive
                        ? "bg-luxury-gold/20 text-luxury-champagne border-luxury-gold/70"
                        : "bg-transparent text-luxury-champagne/90 border-white/15 group-hover:border-luxury-gold/50"
                    }`}
                >
                  More
                </summary>
                <div className="absolute mt-3 left-0 min-w-[220px] glass rounded-2xl p-3 z-30">
                  {categories.slice(MAX_PRIMARY_CATEGORIES).map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={`more-${cat}`}
                        onClick={() => toggleCategory(cat)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs mb-1.5 transition-all duration-200 label uppercase
                          ${
                            active
                              ? "bg-luxury-gold/20 text-luxury-champagne"
                              : "bg-transparent text-luxury-champagne/80 hover:bg-white/10"
                          }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </details>
            )}

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
          </div>

          <div className="flex items-center gap-3 text-[11px] label uppercase text-luxury-mut">
            <span>Sort</span>
            <div className="glass rounded-full px-5 py-2.5">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-luxury-text outline-none cursor-pointer text-[11px] label uppercase"
              >
                <option className="bg-luxury-panel2" value="featured">
                  Featured
                </option>
                <option className="bg-luxury-panel2" value="price-asc">
                  Price ↑
                </option>
                <option className="bg-luxury-panel2" value="price-desc">
                  Price ↓
                </option>
                <option className="bg-luxury-panel2" value="name">
                  Name A–Z
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[360px] rounded-2xl glass p-5">
                <div className="skel rounded-xl aspect-[4/5] mb-5" />
                <div className="skel h-3 w-16 mb-3 rounded" />
                <div className="skel h-6 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="flex flex-wrap justify-center gap-6"
            >
              {filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: idx * 0.03 }}
                  className="w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[360px]"
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="card block rounded-2xl glass p-5 h-full"
                  >
                    <div className="rounded-xl overflow-hidden aspect-[4/5] mb-5 bg-luxury-panel2 relative">
                      {product.target && (
                        <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-[9px] label uppercase bg-luxury-bg/80 border border-white/10 text-luxury-champagne">
                          {targetLabel(String(product.target).toUpperCase())}
                        </span>
                      )}
                      {cardImg(product) ? (
                        <img
                          src={cardImg(product)}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                          No Image
                        </div>
                      )}
                    </div>
                    {product.category && (
                      <p className="label uppercase text-[10px] text-luxury-gold/90 mb-1">
                        {String(product.category).trim()}
                      </p>
                    )}
                    <h3 className="font-serif text-xl sm:text-2xl text-white line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-cormorant text-xl text-luxury-champagne">
                        RM {product.price}
                      </span>
                      <span className="text-luxury-gold2 text-sm">✦</span>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Quiz card */}
              <Link
                to="/quiz"
                className="card flex flex-col items-center justify-center text-center rounded-2xl glass p-5 border-dashed w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-[360px]"
              >
                <div className="w-14 h-14 rounded-full border border-luxury-gold/40 flex items-center justify-center mb-4 text-luxury-gold2 text-2xl">
                  ✦
                </div>
                <h3 className="font-serif text-xl text-white mb-1">
                  Not sure where to start?
                </h3>
                <p className="text-sm text-luxury-mut mb-4">Take the scent quiz.</p>
                <span className="px-6 py-2.5 rounded-full text-[11px] label uppercase border border-luxury-gold/45 text-luxury-champagne">
                  Find your scent
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="font-cormorant italic text-2xl text-luxury-champagne/70">
              No fragrances found for this selection.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopPage;
