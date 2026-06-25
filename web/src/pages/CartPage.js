// src/pages/CartPage.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate, Link } from "react-router-dom";
import { IoTrashOutline, IoCheckmark, IoBagOutline } from "react-icons/io5";

const targetLabel = (t) =>
  t === "MEN" ? "Men" : t === "WOMEN" ? "Women" : t === "UNISEX" ? "Unisex" : "";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, itemCount, subtotal } = useCart();
  const navigate = useNavigate();
  const [itemToDelete, setItemToDelete] = useState(null);

  // Track which cart items are selected for checkout (by cartItemId)
  const [selectedIds, setSelectedIds] = useState([]);

  // Keep selection in sync when cart changes
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => cartItems.some((item) => item.id === id)));
  }, [cartItems]);

  const toggleSelect = (cartItemId) =>
    setSelectedIds((prev) =>
      prev.includes(cartItemId) ? prev.filter((id) => id !== cartItemId) : [...prev, cartItemId]
    );

  const selectAll = () => setSelectedIds(cartItems.map((item) => item.id));
  const clearSelection = () => setSelectedIds([]);
  const allSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const selectedItemCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + parseFloat(item.product?.price || 0) * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (selectedIds.length === 0) return;
    const bad = selectedItems.find((i) => i.quantity > (i.product?.stock ?? Infinity));
    if (bad) return;
    navigate(`/checkout?items=${selectedIds.join(",")}`);
  };

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.1),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-10 md:py-12">
        <h1 className="font-serif text-4xl sm:text-5xl text-white mb-2">Your Bag</h1>
        <p className="font-cormorant italic text-xl text-luxury-champagne/70 mb-9 md:mb-10">
          {itemCount === 0
            ? "Your bag awaits its first fragrance."
            : `${itemCount} fragrance${itemCount !== 1 ? "s" : ""}, awaiting you.`}
        </p>

        {itemCount === 0 ? (
          <div className="glass rounded-3xl p-14 text-center max-w-xl mx-auto">
            <div className="mx-auto w-16 h-16 rounded-full border border-luxury-gold/40 flex items-center justify-center mb-6 text-luxury-gold2">
              <IoBagOutline className="text-2xl" />
            </div>
            <h2 className="font-serif text-2xl text-white mb-2">Your bag is empty</h2>
            <p className="text-luxury-mut mb-8">Discover something to remember, then return here.</p>
            <Link
              to="/shop"
              className="btn-lux inline-block px-9 py-4 rounded-full text-[12px] font-medium label uppercase"
            >
              Explore Fragrances
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Items */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between text-[11px] label uppercase text-luxury-mut">
                <button
                  onClick={() => (allSelected ? clearSelection() : selectAll())}
                  className="inline-flex items-center gap-2 hover:text-white transition"
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      allSelected
                        ? "bg-luxury-gold border-luxury-gold text-luxury-bg"
                        : "border-white/30"
                    }`}
                  >
                    {allSelected && <IoCheckmark className="text-sm" />}
                  </span>
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <span>
                  {selectedItemCount} selected
                </span>
              </div>

              {cartItems.map((item) => {
                const product = item.product || {};
                const unitPrice = parseFloat(product.price || 0);
                const lineTotal = unitPrice * item.quantity;
                const isSelected = selectedIds.includes(item.id);
                const eyebrow = [product.category && String(product.category).trim(), targetLabel(String(product.target || "").toUpperCase())]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={item.id}
                    className={`glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5 transition ${
                      isSelected ? "border-luxury-gold/50" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center transition ${
                        isSelected ? "bg-luxury-gold border-luxury-gold text-luxury-bg" : "border-white/30"
                      }`}
                      aria-label="Select item"
                    >
                      {isSelected && <IoCheckmark className="text-base" />}
                    </button>

                    <div className="w-24 h-28 rounded-xl overflow-hidden bg-luxury-panel2 shrink-0">
                      <img
                        src={product.card_image || product.promo_image || "/placeholder.png"}
                        alt={product.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {eyebrow && (
                        <p className="label uppercase text-[10px] text-luxury-gold/90 mb-1">{eyebrow}</p>
                      )}
                      <h3 className="font-serif text-2xl text-white line-clamp-1">
                        {product.name || "Unnamed Product"}
                      </h3>
                      <p className="text-sm text-luxury-mut mt-1">RM {unitPrice.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center border border-white/15 rounded-full shrink-0">
                      <button
                        onClick={() => updateQuantity(product.id, item.quantity - 1, item.id)}
                        disabled={item.quantity <= 1}
                        className="w-9 h-9 text-luxury-mut hover:text-luxury-gold2 transition disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        –
                      </button>
                      <span className="w-8 text-center text-white text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, item.quantity + 1, item.id)}
                        disabled={item.quantity >= (product.stock ?? Infinity)}
                        className="w-9 h-9 text-luxury-mut hover:text-luxury-gold2 transition disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-cormorant text-2xl text-luxury-champagne sm:w-28 sm:text-right shrink-0">
                      RM {lineTotal.toFixed(2)}
                    </span>

                    <button
                      onClick={() =>
                        setItemToDelete({ productId: product.id, cartItemId: item.id, name: product.name })
                      }
                      className="shrink-0 p-2.5 rounded-full border border-white/10 text-luxury-mut hover:border-red-400/40 hover:text-red-300 transition"
                      aria-label="Remove item"
                    >
                      <IoTrashOutline className="text-xl" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="glass rounded-3xl p-8 h-fit lg:sticky lg:top-28">
              <h3 className="font-serif text-2xl text-white mb-6">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-luxury-mut">
                  <span>Selected ({selectedItemCount})</span>
                  <span className="text-luxury-text">RM {selectedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-luxury-mut">
                  <span>Cart subtotal</span>
                  <span className="text-luxury-text">RM {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-luxury-mut">
                  <span>Shipping</span>
                  <span className="text-luxury-gold2">Complimentary</span>
                </div>
                <div className="flex justify-between text-luxury-mut">
                  <span>Engraving</span>
                  <span className="text-luxury-gold2">Included</span>
                </div>
              </div>
              <div className="rule my-6" />
              <div className="flex justify-between items-baseline mb-8">
                <span className="label uppercase text-[11px] text-luxury-mut">Total</span>
                <span className="font-serif text-3xl text-white">RM {selectedSubtotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedIds.length === 0}
                className="btn-lux w-full py-4 rounded-full text-[12px] font-medium label uppercase disabled:opacity-40"
              >
                {selectedIds.length === 0 ? "Select items to checkout" : "Proceed to Checkout"}
              </button>
              <p className="text-center text-[11px] text-luxury-mut mt-4">
                Secure checkout · 256-bit encryption
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Confirm remove */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-400/30 flex items-center justify-center mx-auto mb-5 text-red-300">
              <IoTrashOutline className="text-2xl" />
            </div>
            <h2 className="font-serif text-2xl text-white mb-2">Remove item?</h2>
            <p className="mb-6 text-luxury-mut">
              Remove <span className="text-white">{itemToDelete.name || "this item"}</span> from your bag?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setItemToDelete(null)}
                className="py-3 rounded-full border border-white/15 text-luxury-text hover:border-luxury-gold/40 transition"
              >
                Keep
              </button>
              <button
                onClick={() => {
                  removeFromCart(itemToDelete.productId, itemToDelete.cartItemId);
                  setItemToDelete(null);
                }}
                className="py-3 rounded-full bg-red-500/80 hover:bg-red-500 text-white font-semibold transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
