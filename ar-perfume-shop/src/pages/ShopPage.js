// src/pages/ShopPage.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http"; 
import PageHeader from "../components/PageHeader";
import { useCart } from "../context/CartContext";
import {
  IoBagHandleOutline,
  IoSwapHorizontalOutline,
  IoChevronForward,
  IoSparklesOutline,
} from "react-icons/io5";

const ShopPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { itemCount } = useCart();

  // ─── Fetch products ────────────────────────────
  useEffect(() => {
    http
      .get("products/") // ✅ hits /api/products/
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

  const filteredProducts = products.filter(
    (product) => activeCategory === "All" || product.category === activeCategory
  );

  const renderStars = (rating) =>
    Array(5)
      .fill(0)
      .map((_, i) => (
        <span
          key={i}
          className={i < rating ? "text-yellow-400" : "text-gray-500"}
        >
          ★
        </span>
      ));

  const rightActions = (
    <div className="flex items-center space-x-8">
      <Link to="/compare" className="text-3xl md:text-4xl" title="Compare">
        <IoSwapHorizontalOutline />
      </Link>
      <Link to="/quiz" className="text-2xl" title="Fragrance Quiz">
        <IoSparklesOutline />
      </Link>
      <Link to="/cart" className="relative text-3xl md:text-4xl" title="Cart">
        <IoBagHandleOutline />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Link>
    </div>
  );

  if (loading) return <p className="text-white">Loading products...</p>;

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-2xl py-6 text-[18px] md:text-[19px] lg:text-[20px]">
        <PageHeader title="SHOP" right={rightActions} />

        {/* Categories */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {["All", "Fresh", "Bold"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-lg font-semibold ${
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

        {/* Products grid */}
        {filteredProducts.length === 0 ? (
          <p className="text-white/70">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="h-full">
                <div className="h-full bg-white/10 p-5 rounded-2xl shadow-md hover:shadow-lg transition flex flex-col justify-between">
                  <div>
                    <div className="w-full rounded-xl mb-4 overflow-hidden bg-black/10 aspect-[4/5] flex items-center justify-center">
                      <img
                        src={product.card_image || "/placeholder.png"} // ✅ fallback
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="text-white font-bold text-xl md:text-2xl">
                      {product.name}
                    </h3>
                    <div className="flex my-2 text-lg">
                      {renderStars(product.rating || 0)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-white font-extrabold text-2xl">
                      RM {product.price}
                    </p>
                    <div className="bg-white rounded-full p-2">
                      <IoChevronForward className="text-blue-900 text-3xl" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
