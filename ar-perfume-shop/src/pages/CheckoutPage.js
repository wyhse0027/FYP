// src/pages/CheckoutPage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { useCart } from "../context/CartContext";
import http from "../lib/http";

// Currency helper
const formatMYR = (num) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(num);

const PAYMENT_METHODS = {
  COD: "COD",
  CARD: "CARD",
  FPX: "FPX",
  EWALLET: "EWALLET",
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems = [], clearCart } = useCart?.() || {};

  // Normalize items
  const items = (cartItems || []).map((it) => ({
    id: it.product?.id || it.id,
    name: it.product?.name || it.name,
    price: Number(it.product?.price || it.price),
    qty: Number(it.quantity),
    cartItemId: it.id,
  }));

  // Totals
  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const shipping = subtotal > 200 ? 0 : 10;
  const total = subtotal + shipping;

  // Address state
  const [addr, setAddr] = useState({
    fullname: "",
    phone: "",
    line1: "",
    line2: "",
    postcode: "",
    city: "",
    state: "",
    country: "Malaysia",
  });

  // Payment + modal state
  const [pm, setPm] = useState(PAYMENT_METHODS.COD);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payNow, setPayNow] = useState(false); // ✅ track pay now / pay later
  const isValid =
    addr.fullname &&
    addr.phone &&
    addr.line1 &&
    addr.postcode &&
    addr.city &&
    addr.state;

  // Place order
  const placeOrder = async () => {
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.qty,
        })),
        fullname: addr.fullname,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2,
        postcode: addr.postcode,
        city: addr.city,
        state: addr.state,
        country: addr.country,
      };

      console.log("📦 Sending order payload:", payload);
      const orderRes = await http.post("orders/", payload);
      const order = orderRes.data;

      // Payment record
      const payPayload = {
        order_id: order.id,
        method: pm,
        amount: total,
        status: payNow ? "PAID" : "PENDING",
      };
      await http.post("payments/", payPayload);

      // If pay now → immediately mark as shipped
      if (payNow) {
        await http.post(`orders/${order.id}/pay/`);
      }

      if (typeof clearCart === "function") clearCart();

      navigate("/orders?tab=" + (payNow ? "TO_SHIP" : "TO_PAY"));
    } catch (err) {
      console.error("❌ Order placement failed:", err);
      if (err.response) {
        alert("Error placing order: " + JSON.stringify(err.response.data));
      } else {
        alert("Error placing order: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-2xl py-6 text-[18px] md:text-[19px] lg:text-[20px]">
        <PageHeader title="Checkout" />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Address + Payment */}
          <div className="lg:col-span-2 grid gap-4">
            {/* Address */}
            <section className="bg-white/5 p-4 rounded-xl">
              <h2 className="font-semibold text-white mb-3">Delivery Address</h2>
              <div className="grid grid-cols-1 gap-2 text-white">
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="Full name"
                  value={addr.fullname}
                  onChange={(e) => setAddr({ ...addr, fullname: e.target.value })}
                />
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="Phone"
                  value={addr.phone}
                  onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                />
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="Address line 1"
                  value={addr.line1}
                  onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                />
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="Address line 2 (optional)"
                  value={addr.line2}
                  onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                    placeholder="Postcode"
                    value={addr.postcode}
                    onChange={(e) => setAddr({ ...addr, postcode: e.target.value })}
                  />
                  <input
                    className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                    placeholder="City"
                    value={addr.city}
                    onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                  />
                </div>
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="State"
                  value={addr.state}
                  onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                />
                <input
                  className="bg-white/10 p-3 rounded-lg text-lg placeholder-white/60"
                  placeholder="Country"
                  value={addr.country}
                  onChange={(e) => setAddr({ ...addr, country: e.target.value })}
                />
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white/5 p-4 rounded-xl">
              <h2 className="font-semibold text-white mb-3">Payment Method</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-white">
                {[
                  { key: PAYMENT_METHODS.COD, label: "Cash on delivery" },
                  { key: PAYMENT_METHODS.CARD, label: "Card (demo)" },
                  { key: PAYMENT_METHODS.FPX, label: "FPX (demo)" },
                  { key: PAYMENT_METHODS.EWALLET, label: "eWallet (demo)" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`p-3 rounded-lg border text-lg cursor-pointer ${
                      pm === opt.key ? "border-sky-500" : "border-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mr-3 scale-125 align-middle"
                      checked={pm === opt.key}
                      onChange={() => setPm(opt.key)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Summary */}
          <aside className="bg-white/5 p-4 rounded-xl h-max sticky top-4 text-white">
            <h2 className="font-semibold mb-3">Order Summary</h2>
            <div className="flex justify-between mb-1">
              <span>Subtotal</span>
              <span>{formatMYR(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Shipping</span>
              <span>{formatMYR(shipping)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg mt-2">
              <span>Total</span>
              <span>{formatMYR(total)}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-5">
              {/* Cancel/Return */}
              <button
                onClick={() => navigate("/cart")}
                className="w-full py-4 rounded-xl font-bold bg-white/10 text-white text-lg"
              >
                RETURN
              </button>

              {/* Place Order - Pay Later */}
              <button
                disabled={!isValid || items.length === 0}
                onClick={() => {
                  setPayNow(false);
                  setConfirmOpen(true);
                }}
                className={`w-full py-4 rounded-xl font-extrabold text-lg ${
                  isValid && items.length > 0 ? "bg-amber-500" : "bg-gray-600"
                }`}
              >
                PLACE ORDER (Pay Later)
              </button>

              {/* Pay & Place Order */}
              <button
                disabled={!isValid || items.length === 0}
                onClick={() => {
                  setPayNow(true);
                  setConfirmOpen(true);
                }}
                className={`w-full py-4 rounded-xl font-extrabold text-lg ${
                  isValid && items.length > 0 ? "bg-emerald-600" : "bg-gray-600"
                }`}
              >
                PAY & PLACE ORDER
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title={payNow ? "Pay & Place Order?" : "Place Order?"}
        message={`Total to pay: ${formatMYR(total)}${
          payNow ? " (charged now)" : " (pay later)"
        }`}
        confirmText={payNow ? "Pay Now" : "Place Order"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          placeOrder();
        }}
      />
    </div>
  );
}
