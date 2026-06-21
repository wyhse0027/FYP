import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { useCart } from "../context/CartContext";
import http from "../lib/http";

// Currency helper
const formatMYR = (num) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(Number(num || 0));

const PAYMENT_METHODS = {
  COD: "COD",
  CARD: "CARD",
  FPX: "FPX",
  EWALLET: "E_WALLET",
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingOrderId = searchParams.get("order"); // if set => pay existing order
  const isExistingPayFlow = !!existingOrderId;

  // selected cart item IDs from query (?items=1,2,3)
  const selectedItemsParam = searchParams.get("items");
  const selectedCartItemIds = selectedItemsParam
    ? selectedItemsParam
        .split(",")
        .map((v) => parseInt(v, 10))
        .filter(Boolean)
    : null;

  const { cartItems = [], clearCart } = useCart?.() || {};
  const [existingOrder, setExistingOrder] = useState(null);

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

  // Payment + modal + result state
  const [pm, setPm] = useState(PAYMENT_METHODS.COD);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Result panels
  const [paidOrderId, setPaidOrderId] = useState(null); // Pay & Place / Pay existing
  const [invoiceOrderId, setInvoiceOrderId] = useState(null); // Pay Later

  // Load existing order for "PAY" flow
  useEffect(() => {
    if (!isExistingPayFlow) return;

    const fetchOrder = async () => {
      try {
        const res = await http.get(`orders/${existingOrderId}/`);
        const o = res.data;

        if (o.status !== "TO_PAY") {
          navigate("/orders?tab=TO_PAY", { replace: true });
          return;
        }

        setExistingOrder(o);

        setAddr({
          fullname: o.fullname || "",
          phone: o.phone || "",
          line1: o.line1 || "",
          line2: o.line2 || "",
          postcode: o.postcode || "",
          city: o.city || "",
          state: o.state || "",
          country: o.country || "Malaysia",
        });
      } catch (err) {
        console.error("Failed to load order:", err);
        navigate("/orders?tab=TO_PAY", { replace: true });
      }
    };

    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExistingPayFlow, existingOrderId]);

  // Items & totals
  const items = isExistingPayFlow
    ? (existingOrder?.items || []).map((i) => ({
        id: i.product?.id,
        name: i.product?.name,
        price: Number(i.price),
        qty: Number(i.quantity),
      }))
    : (cartItems || [])
        .filter((it) =>
          selectedCartItemIds ? selectedCartItemIds.includes(it.id) : true
        )
        .map((it) => ({
          id: it.product?.id || it.id,
          name: it.product?.name || it.name,
          price: Number(it.product?.price || it.price),
          qty: Number(it.quantity),
          cartItemId: it.id,
        }));

  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);

  const existingTotal =
    isExistingPayFlow && existingOrder ? Number(existingOrder.total || 0) : null;

  const shipping = isExistingPayFlow
    ? Math.max((existingTotal || 0) - subtotal, 0)
    : subtotal > 200
    ? 0
    : 10;

  const total =
    isExistingPayFlow && existingTotal != null ? existingTotal : subtotal + shipping;

  const newOrderAddressValid =
    addr.fullname &&
    addr.phone &&
    addr.line1 &&
    addr.postcode &&
    addr.city &&
    addr.state;

  const isValid =
    items.length > 0 && (isExistingPayFlow ? !!existingOrder : newOrderAddressValid);

  const payExistingOrder = async () => {
    if (!isExistingPayFlow || !existingOrderId || !existingOrder) return;

    try {
      setLoading(true);

      if (pm === PAYMENT_METHODS.COD) {
        // Existing order payment flow: just keep it unpaid / COD.
        // You can optionally update method if backend supports it.
        setPaidOrderId(existingOrderId); // or just redirect
        return;
      }
      const res = await http.post(`orders/${existingOrderId}/pay/`, {
        method: pm,
        success: true,
      });
      setPaidOrderId(res.data.id);
    } catch (err) {
      console.error("❌ Existing order payment failed:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Payment update failed. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!isValid || isExistingPayFlow) return;

    const effectivePayNow = payNow && pm !== PAYMENT_METHODS.COD;

    try {
      setLoading(true);

      const orderPayload = {
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
        fullname: addr.fullname,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2,
        postcode: addr.postcode,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        payment_method: pm,
      };

      const orderRes = await http.post("orders/", orderPayload);
      const order = orderRes.data;

      if (pm === PAYMENT_METHODS.COD) {
        // COD = pay on delivery. No confirmation call here.
        if (typeof clearCart === "function") clearCart();

        // show "Order Placed" panel (pay later style) or directly redirect
        setInvoiceOrderId(order.id); // <-- use this panel
        return;
      }

      if (effectivePayNow) {
        try {
          const payRes = await http.post(`orders/${order.id}/pay/`, {
            method: pm,
            success: true,
          });

          if (typeof clearCart === "function") clearCart();
          setPaidOrderId(payRes.data.id);
          return;
        } catch (err) {
          console.error("❌ Pay & Place failed:", err);
          const data = err.response?.data || {};
          if (data.detail === "Payment failed.") {
            alert(
              "Payment failed. Your order is created but still unpaid. You can retry from 'To Pay'."
            );
            if (data.order?.id) setInvoiceOrderId(data.order.id);
          } else {
            alert(
              data.error ||
                data.detail ||
                "Error during payment. Please check your order in 'To Pay'."
            );
          }
          return;
        }
      }

      if (typeof clearCart === "function") clearCart();
      setInvoiceOrderId(order.id);
    } catch (err) {
      console.error("❌ Order placement failed:", err);
      if (err.response?.data) {
        alert("Error placing order: " + JSON.stringify(err.response.data));
      } else {
        alert("Error placing order: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const payNowEnabled = isExistingPayFlow
    ? isValid && !loading
    : isValid && !loading && pm !== PAYMENT_METHODS.COD;

  const confirmIsPayNow =
    isExistingPayFlow ||
    (payNow && !isExistingPayFlow && pm !== PAYMENT_METHODS.COD);

  const paymentOptions = [
    { key: PAYMENT_METHODS.COD, label: "Cash on Delivery", hint: "Pay when it arrives" },
    { key: PAYMENT_METHODS.CARD, label: "Card", hint: "Visa / Mastercard" },
    { key: PAYMENT_METHODS.FPX, label: "FPX", hint: "Online banking" },
    { key: PAYMENT_METHODS.EWALLET, label: "E-Wallet", hint: "Touch 'n Go / etc" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 sm:w-80 sm:h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-56 h-56 sm:w-64 sm:h-64 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-12 lg:px-16 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-screen-2xl text-[15px] sm:text-[17px] md:text-[18px] lg:text-[20px]">
          {/* Header (keep PageHeader) */}
          <div className="mb-4 sm:mb-6">
            <PageHeader title={isExistingPayFlow ? "COMPLETE PAYMENT" : "SECURE CHECKOUT"} />
            <p className="text-white/60 mt-1 sm:mt-2 text-sm sm:text-base">
              {isExistingPayFlow
                ? "Finalize your pending order"
                : "Complete your purchase securely"}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-4 md:gap-6">
            {/* Left: Address + Payment */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              {/* Address */}
              <section className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl">
                <h2 className="font-semibold text-white mb-3 sm:mb-4 text-lg sm:text-xl">
                  Delivery Address
                </h2>

                <div className="grid md:grid-cols-2 gap-3 text-white text-sm sm:text-base">
                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="Full name"
                    value={addr.fullname}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, fullname: e.target.value })}
                  />
                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="Phone"
                    value={addr.phone}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                  />

                  <div className="md:col-span-2">
                    <input
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                                 focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                      placeholder="Address line 1"
                      value={addr.line1}
                      disabled={isExistingPayFlow}
                      onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                                 focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                      placeholder="Address line 2 (optional)"
                      value={addr.line2}
                      disabled={isExistingPayFlow}
                      onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
                    />
                  </div>

                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="Postcode"
                    value={addr.postcode}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, postcode: e.target.value })}
                  />
                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="City"
                    value={addr.city}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                  />
                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="State"
                    value={addr.state}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                  />
                  <input
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 sm:px-4 sm:py-4 text-white placeholder-white/40
                               focus:outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20 transition disabled:opacity-50"
                    placeholder="Country"
                    value={addr.country}
                    disabled={isExistingPayFlow}
                    onChange={(e) => setAddr({ ...addr, country: e.target.value })}
                  />
                </div>
              </section>

              {/* Payment */}
              <section className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl">
                <h2 className="font-semibold text-white mb-3 sm:mb-4 text-lg sm:text-xl">
                  Payment Method
                </h2>

                <div className="grid sm:grid-cols-2 gap-3">
                  {paymentOptions.map((opt) => {
                    const selected = pm === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPm(opt.key)}
                        className={`text-left p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                          selected
                            ? "bg-sky-500/20 border-sky-400/50 shadow-lg shadow-sky-500/10"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`font-semibold ${
                                selected ? "text-white" : "text-white/80"
                              } text-sm sm:text-base`}
                            >
                              {opt.label}
                            </p>
                            <p className="text-xs sm:text-sm text-white/50 mt-1">
                              {opt.hint}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selected ? "border-sky-300 bg-sky-300" : "border-white/30"
                            }`}
                          >
                            {selected && (
                              <div className="w-2 h-2 bg-slate-900 rounded-full" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!isExistingPayFlow && pm === PAYMENT_METHODS.COD && (
                  <p className="text-amber-300/80 text-xs sm:text-sm mt-3 sm:mt-4">
                    COD orders will be paid upon delivery. Online payment is disabled.
                  </p>
                )}
              </section>
            </div>

            {/* Right: Summary */}
            <aside className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl h-max sticky top-4 sm:top-6">
              <h2 className="font-semibold text-white mb-3 sm:mb-4 text-lg sm:text-xl">
                Order Summary
              </h2>

              <div className="space-y-2 text-white/75 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white">{formatMYR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-white">
                    {shipping === 0 ? "FREE" : formatMYR(shipping)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-lg sm:text-xl font-extrabold text-white pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/10">
                <span>Total</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-300">
                  {formatMYR(total)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:gap-3 mt-5 sm:mt-6">
                <button
                  onClick={() =>
                    navigate(isExistingPayFlow ? "/orders?tab=TO_PAY" : "/cart")
                  }
                  className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-white/10 text-white hover:bg-white/15 transition disabled:opacity-50"
                  disabled={loading}
                >
                  RETURN
                </button>

                {!isExistingPayFlow && (
                  <button
                    disabled={!isValid || loading}
                    onClick={() => {
                      setPayNow(false);
                      setConfirmOpen(true);
                    }}
                    className={`w-full py-3 sm:py-4 rounded-xl font-extrabold text-base sm:text-lg transition-all duration-300
                      flex items-center justify-center gap-3 ${
                        isValid && !loading
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                          : "bg-white/10 text-white/40 cursor-not-allowed"
                      }`}
                  >
                    {loading ? (
                      <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "PLACE ORDER (Pay Later)"
                    )}
                  </button>
                )}

                <button
                  disabled={!payNowEnabled}
                  onClick={() => {
                    if (isExistingPayFlow) {
                      setConfirmOpen(true);
                    } else {
                      setPayNow(true);
                      setConfirmOpen(true);
                    }
                  }}
                  className={`w-full py-3 sm:py-4 rounded-xl font-extrabold text-base sm:text-lg transition-all duration-300
                    flex items-center justify-center gap-3 ${
                      payNowEnabled
                        ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                >
                  {loading ? (
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isExistingPayFlow ? (
                    "PAY NOW"
                  ) : (
                    "PAY & PLACE ORDER"
                  )}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmIsPayNow ? "Confirm Payment?" : "Place Order?"}
        message={`Total to pay: ${formatMYR(total)}${
          confirmIsPayNow
            ? isExistingPayFlow
              ? " (confirm this payment method)"
              : " (charged now)"
            : " (pay later)"
        }`}
        confirmText={confirmIsPayNow ? "Confirm" : "Place Order"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          if (isExistingPayFlow) payExistingOrder();
          else placeOrder();
        }}
      />

      {/* Panel: Payment Successful / Method Confirmed */}
      {paidOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white text-3xl font-black">✓</span>
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-white">Order Updated</h2>
            <p className="text-white/70 mb-6">Your order #{paidOrderId} has been processed.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await http.get(`orders/${paidOrderId}/receipt-pdf/`, {
                      responseType: "blob",
                    });
                    const blob = new Blob([res.data], { type: "application/pdf" });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `order_${paidOrderId}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
                  } catch (err) {
                    console.error("Failed to download PDF:", err);
                    alert("Unable to download PDF. Please try again.");
                  }
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition"
              >
                Download PDF
              </button>

              <button
                onClick={() => {
                  setPaidOrderId(null);
                  navigate("/orders?tab=TO_SHIP");
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-95 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: Pay Later (invoice) */}
      {invoiceOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-white text-3xl font-black">★</span>
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-white">Order Placed</h2>
            <p className="text-white/70 mb-6">
              Your order #{invoiceOrderId} has been created. You can pay later with any
              available payment method.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await http.get(`orders/${invoiceOrderId}/receipt-pdf/`, {
                      responseType: "blob",
                    });
                    const blob = new Blob([res.data], { type: "application/pdf" });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `invoice_order_${invoiceOrderId}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
                  } catch (err) {
                    console.error("Failed to download invoice:", err);
                    alert("Unable to download invoice. Please try again.");
                  }
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition"
              >
                Download Invoice
              </button>

              <button
                onClick={() => {
                  setInvoiceOrderId(null);
                  navigate("/orders?tab=TO_PAY");
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
