// src/context/CartContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import http from "../lib/http";
import { useAuth } from "./AuthContext"; // ✅ import to detect login state

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { isAuthed } = useAuth(); // ✅ login state from AuthContext

  // ─── Load cart: prefer backend if logged in, else localStorage ───────────
  useEffect(() => {
    // always load local storage for guests
    const saved = localStorage.getItem("cart");
    if (saved) setCartItems(JSON.parse(saved));

    // skip backend fetch if not logged in
    if (!isAuthed) return;

    const loadCart = async () => {
      try {
        const res = await http.get("carts/");
        if (res.data.length > 0) {
          const cart = res.data[0];
          setCartItems(
            cart.items.map((item) => ({
              id: item.id, // cart item id
              quantity: item.quantity,
              product: item.product,
            }))
          );
          localStorage.removeItem("cart"); // backend takes over
        }
      } catch (err) {
        console.warn("Cart fetch skipped:", err.response?.status || err.message);
      }
    };

    loadCart();
  }, [isAuthed]);

  // ─── Always persist to localStorage for guests ──────────────────────────
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // ─── Add item to cart ───────────────────────────────────────────────────
  const addToCart = async (product, quantity) => {
    try {
      const res = await http.post("cart-items/", {
        product_id: product.id,
        quantity,
      });

      const newItem = res.data;
      setCartItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        return [...prev, { id: newItem.id, quantity, product }];
      });
    } catch (err) {
      // fallback guest behavior
      console.warn("Guest addToCart fallback:", err.message);
      setCartItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        return [...prev, { id: Date.now(), quantity, product }];
      });
    }
  };

  // ─── Update item quantity ───────────────────────────────────────────────
  const updateQuantity = async (productId, newQuantity, cartItemId) => {
    try {
      if (newQuantity <= 0) {
        await http.delete(`cart-items/${cartItemId}/`);
        setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
      } else {
        await http.patch(`cart-items/${cartItemId}/`, { quantity: newQuantity });
        setCartItems((prev) =>
          prev.map((i) =>
            i.product.id === productId ? { ...i, quantity: newQuantity } : i
          )
        );
      }
    } catch (err) {
      console.warn("Guest updateQuantity fallback:", err.message);
      setCartItems((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: newQuantity } : i
        )
      );
    }
  };

  // ─── Remove item ────────────────────────────────────────────────────────
  const removeFromCart = async (productId, cartItemId) => {
    try {
      await http.delete(`cart-items/${cartItemId}/`);
      setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
    } catch (err) {
      console.warn("Guest removeFromCart fallback:", err.message);
      setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
    }
  };

  // ─── Clear cart ─────────────────────────────────────────────────────────
  const clearCart = async () => {
    try {
      await Promise.all(
        cartItems.map((item) => http.delete(`cart-items/${item.id}/`))
      );
      setCartItems([]);
    } catch {
      setCartItems([]); // fallback clear
    }
  };

  // ─── Merge local cart into backend cart ─────────────────────────────────
  const mergeCartToBackend = async () => {
    try {
      if (!cartItems.length) return;

      for (const item of cartItems) {
        await http.post("cart-items/", {
          product_id: item.product.id,
          quantity: item.quantity,
        });
      }

      const res = await http.get("carts/");
      if (res.data.length > 0) {
        const cart = res.data[0];
        setCartItems(
          cart.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            product: item.product,
          }))
        );
      }

      localStorage.removeItem("cart");
    } catch (err) {
      console.error("Error merging cart:", err);
    }
  };

  // ─── Totals ─────────────────────────────────────────────────────────────
  const itemCount = cartItems.reduce((t, i) => t + i.quantity, 0);
  const subtotal = cartItems.reduce(
    (t, i) => t + i.quantity * parseFloat(i.product.price),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        mergeCartToBackend,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
