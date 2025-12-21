// src/pages/CartPage.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { IoTrashOutline } from "react-icons/io5";
import {
  CheckCircle2,
  Crown,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, itemCount, subtotal } =
    useCart();

  const navigate = useNavigate();
  const [itemToDelete, setItemToDelete] = useState(null);

  // Track which cart items are selected for checkout (by cartItemId)
  const [selectedIds, setSelectedIds] = useState([]);

  // Keep selection in sync when cart changes
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => cartItems.some((item) => item.id === id))
    );
  }, [cartItems]);

  const toggleSelect = (cartItemId) => {
    setSelectedIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const selectAll = () => setSelectedIds(cartItems.map((item) => item.id));
  const clearSelection = () => setSelectedIds([]);

  const allSelected =
    cartItems.length > 0 && selectedIds.length === cartItems.length;

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));

  // quantity-based count for selected items
  const selectedItemCount = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + parseFloat(item.product?.price || 0) * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (selectedIds.length === 0) return;
    const query = `items=${selectedIds.join(",")}`;
    navigate(`/checkout?${query}`);
  };

  return (
    <>
      <div className="min-h-screen w-full bg-blue-900/95 relative overflow-hidden pb-[calc(80px+260px)]">
        {/* Decorative elements (same palette, just nicer) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-screen-2xl py-8 text-[18px] md:text-[19px] lg:text-[20px]">
            {/* Main shell */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
              {/* Keep your header component */}
              <PageHeader title="YOUR COLLECTION" />

              {itemCount === 0 ? (
                <div className="mt-10 glass-ish p-14 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                    <ShoppingBag className="w-8 h-8 text-white/60" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Your bag is empty
                  </h2>
                  <p className="text-white/70 mb-8">
                    Add something you like, then come back here.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-extrabold transition"
                  >
                    Explore products
                  </button>
                </div>
              ) : (
                <>
                  {/* Select all bar (lovable feel, same logic/colors) */}
                  <div className="mt-6 mb-6 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => (allSelected ? clearSelection() : selectAll())}
                      className="inline-flex items-center gap-3 text-white hover:text-white transition"
                    >
                      <span
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                          allSelected
                            ? "bg-blue-400/90 border-blue-400/90"
                            : "border-white/30 hover:border-white/60"
                        }`}
                      >
                        {allSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-950" />
                        ) : null}
                      </span>
                      <span className="text-sm">
                        {allSelected ? "Deselect all" : "Select all items"}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 text-white/80">
                      <Crown className="w-5 h-5 text-yellow-300/90" />
                      <span className="font-semibold">
                        {selectedItemCount} item{selectedItemCount !== 1 ? "s" : ""} selected
                      </span>
                    </div>
                  </div>

                  {/* Cart items */}
                  <div className="space-y-5">
                    {cartItems.map((item) => {
                      const cartItemId = item.id;
                      const product = item.product || {};
                      const unitPrice = parseFloat(product.price || 0);
                      const lineTotal = unitPrice * item.quantity;
                      const isSelected = selectedIds.includes(cartItemId);

                      return (
                        <div
                          key={cartItemId}
                          className={`bg-white/10 border border-white/10 rounded-2xl p-5 transition-all duration-300 ${
                            isSelected
                              ? "ring-2 ring-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.18)]"
                              : "hover:bg-white/15"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-5">
                            {/* Select */}
                            <div className="flex items-start md:items-center">
                              <button
                                type="button"
                                onClick={() => toggleSelect(cartItemId)}
                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${
                                  isSelected
                                    ? "bg-blue-400/90 border-blue-400/90"
                                    : "border-white/30 hover:border-white/60"
                                }`}
                                aria-label="Select item"
                              >
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-blue-950" />
                                ) : null}
                              </button>
                            </div>

                            {/* Image */}
                            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-black/10 border border-white/10 flex-shrink-0 group">
                              <img
                                src={
                                  product.card_image ||
                                  product.promo_image ||
                                  "/placeholder.png"
                                }
                                alt={product.name || "Product"}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 text-white">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h2 className="font-bold text-xl line-clamp-2">
                                    {product.name || "Unnamed Product"}
                                  </h2>
                                  <p className="text-white/70 text-sm mt-1">
                                    RM {unitPrice.toFixed(2)} each
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-white/60 text-xs">Subtotal</p>
                                  <p className="font-extrabold text-lg">
                                    RM {lineTotal.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {/* Qty controls */}
                              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                                <div className="inline-flex items-center gap-1 bg-white/10 border border-white/10 rounded-xl p-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(
                                        product.id,
                                        item.quantity - 1,
                                        cartItemId
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                    className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-4 h-4 text-white" />
                                  </button>

                                  <span className="w-12 text-center font-extrabold">
                                    {item.quantity}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(
                                        product.id,
                                        item.quantity + 1,
                                        cartItemId
                                      )
                                    }
                                    className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-4 h-4 text-white" />
                                  </button>
                                </div>

                                {/* remove */}
                                <button
                                  onClick={() =>
                                    setItemToDelete({
                                      productId: product.id,
                                      cartItemId,
                                      name: product.name,
                                    })
                                  }
                                  className="flex-shrink-0 p-3 rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-400/30 transition group"
                                  aria-label="Remove item"
                                >
                                  <IoTrashOutline className="text-2xl text-white/80 group-hover:text-red-200 transition" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer (lovable-ish) */}
        {itemCount > 0 && (
          <footer className="fixed left-0 right-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50">
            <div className="bg-gradient-to-t from-blue-950/90 via-blue-950/80 to-transparent pt-5 pb-4 sm:pt-8 sm:pb-6 px-6">
              <div className="mx-auto w-full max-w-screen-2xl">
                <div className="bg-white rounded-2xl p-5 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="text-lg">
                      <span className="font-semibold">
                        {itemCount} item{itemCount !== 1 ? "s" : ""} in cart
                      </span>{" "}
                      <span className="text-gray-500 text-sm">
                        · Cart subtotal: RM {subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-base font-semibold">
                      Selected: {selectedItemCount} item
                      {selectedItemCount !== 1 ? "s" : ""} ·{" "}
                      RM {selectedSubtotal.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={selectedIds.length === 0}
                    className={`w-full py-4 rounded-xl font-extrabold text-lg transition ${
                      selectedIds.length === 0
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-blue-800 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {selectedIds.length === 0
                      ? "Select items to checkout"
                      : "CHECKOUT SELECTED"}
                  </button>
                </div>
              </div>
            </div>
          </footer>
        )}

        {/* Confirmation dialog */}
        {itemToDelete && (
          <ConfirmationDialog
            item={itemToDelete}
            onConfirm={() => {
              removeFromCart(itemToDelete.productId, itemToDelete.cartItemId);
              setItemToDelete(null);
            }}
            onCancel={() => setItemToDelete(null)}
          />
        )}
      </div>
    </>
  );
};

const ConfirmationDialog = ({ item, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-7 w-full max-w-sm text-center shadow-2xl">
      <div className="w-16 h-16 rounded-2xl bg-red-600/10 flex items-center justify-center mx-auto mb-5">
        <Trash2 className="w-8 h-8 text-red-600" />
      </div>

      <h2 className="text-xl font-extrabold mb-2">Remove Item?</h2>
      <p className="mb-6 text-gray-600">
        Remove{" "}
        <span className="font-bold text-gray-900">
          {item.name || "this item"}
        </span>{" "}
        from your cart?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onCancel}
          className="border border-gray-200 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition"
        >
          Keep
        </button>
        <button
          onClick={onConfirm}
          className="bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-500 transition"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
);

export default CartPage;

/* quick helper class (optional): if you already have a glass util, remove this.
   Tailwind doesn't allow custom class here unless in CSS, so ignore. */
