import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
        image: i.product?.card_image || i.product?.promo_image,
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
          image: it.product?.card_image || it.product?.promo_image,
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
        setPaidOrderId(existingOrderId);
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
        if (typeof clearCart === "function") clearCart();
        setInvoiceOrderId(order.id);
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

  const field = (label, key, opts = {}) => (
    <div className={opts.full ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] label uppercase text-luxury-mut mb-2">{label}</label>
      <input
        className="fld w-full px-4 py-3.5 rounded-xl text-white outline-none disabled:opacity-50"
        placeholder={opts.placeholder || label}
        value={addr[key]}
        disabled={isExistingPayFlow}
        onChange={(e) => setAddr({ ...addr, [key]: e.target.value })}
      />
    </div>
  );

  const downloadPdf = async (orderId, prefix) => {
    try {
      const res = await http.get(`orders/${orderId}/receipt-pdf/`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${prefix}_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Unable to download PDF. Please try again.");
    }
  };

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.1),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-10 md:py-12">
        {/* Stepper */}
        <div className="flex items-center gap-4 text-[11px] label uppercase mb-9 md:mb-10">
          <span className="text-luxury-gold2">Bag</span>
          <span className="text-luxury-mut">—</span>
          <span className="text-luxury-gold2">Details</span>
          <span className="text-luxury-mut">—</span>
          <span className="text-luxury-mut">Confirmation</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-12">
          {/* Left */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="font-serif text-3xl text-white mb-6">Contact &amp; Delivery</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {field("Full name", "fullname", { full: true })}
                {field("Phone", "phone")}
                {field("Postal code", "postcode")}
                {field("Address line 1", "line1", { full: true })}
                {field("Address line 2 (optional)", "line2", { full: true })}
                {field("City", "city")}
                {field("State", "state")}
                {field("Country", "country", { full: true })}
              </div>
              {isExistingPayFlow && (
                <p className="text-xs text-luxury-mut mt-4">
                  Delivery details are locked for this pending order.
                </p>
              )}
            </div>

            <div>
              <h2 className="font-serif text-3xl text-white mb-6">Payment</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {paymentOptions.map((opt) => {
                  const selected = pm === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPm(opt.key)}
                      className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                        selected
                          ? "border-luxury-gold/70 bg-luxury-gold/12"
                          : "border-white/10 bg-white/5 hover:border-luxury-gold/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-serif text-xl ${selected ? "text-white" : "text-luxury-text"}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-luxury-mut mt-1">{opt.hint}</p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                            selected ? "border-luxury-gold bg-luxury-gold" : "border-white/30"
                          }`}
                        >
                          {selected && <span className="w-2 h-2 bg-luxury-bg rounded-full" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!isExistingPayFlow && pm === PAYMENT_METHODS.COD && (
                <p className="text-luxury-gold2/80 text-xs mt-4">
                  COD orders are paid upon delivery. Online payment is disabled.
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="glass rounded-3xl p-8 h-fit lg:sticky lg:top-28">
            <h3 className="font-serif text-2xl text-white mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6">
              {items.map((i) => (
                <div key={i.cartItemId || i.id} className="flex items-center gap-4">
                  <div className="w-14 h-16 rounded-lg overflow-hidden bg-luxury-panel2 shrink-0">
                    {i.image ? (
                      <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg text-white truncate">{i.name}</p>
                    <p className="text-xs text-luxury-mut">Qty {i.qty}</p>
                  </div>
                  <span className="font-cormorant text-lg text-luxury-champagne whitespace-nowrap">
                    {formatMYR(i.price * i.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-luxury-mut">
                <span>Subtotal</span>
                <span className="text-luxury-text">{formatMYR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-luxury-mut">
                <span>Shipping</span>
                <span className={shipping === 0 ? "text-luxury-gold2" : "text-luxury-text"}>
                  {shipping === 0 ? "Complimentary" : formatMYR(shipping)}
                </span>
              </div>
            </div>

            <div className="rule my-6" />

            <div className="flex justify-between items-baseline mb-8">
              <span className="label uppercase text-[11px] text-luxury-mut">Total</span>
              <span className="font-serif text-3xl text-white">{formatMYR(total)}</span>
            </div>

            <div className="space-y-3">
              {!isExistingPayFlow && (
                <button
                  disabled={!isValid || loading}
                  onClick={() => {
                    setPayNow(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full py-4 rounded-full text-[12px] font-medium label uppercase border border-luxury-gold/45 text-luxury-champagne hover:bg-luxury-gold/10 transition disabled:opacity-40"
                >
                  {loading ? "Working…" : "Place Order · Pay Later"}
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
                className="btn-lux w-full py-4 rounded-full text-[12px] font-medium label uppercase disabled:opacity-40"
              >
                {loading
                  ? "Working…"
                  : isExistingPayFlow
                  ? "Pay Now"
                  : "Pay & Place Order"}
              </button>

              <button
                onClick={() => navigate(isExistingPayFlow ? "/orders?tab=TO_PAY" : "/cart")}
                disabled={loading}
                className="w-full py-3 rounded-full text-[11px] label uppercase text-luxury-mut hover:text-white transition disabled:opacity-40"
              >
                Return
              </button>
            </div>
          </aside>
        </div>
      </main>

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

      {/* Panel: Payment Successful */}
      {paidOrderId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl p-9 w-full max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 btn-lux rounded-full flex items-center justify-center text-3xl">
              ✓
            </div>
            <h2 className="font-serif text-3xl text-white mb-2">Order Updated</h2>
            <p className="text-luxury-mut mb-7">Your order #{paidOrderId} has been processed.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => downloadPdf(paidOrderId, "order")}
                className="flex-1 py-3 rounded-full border border-white/15 text-luxury-text hover:border-luxury-gold/40 transition"
              >
                Download PDF
              </button>
              <button
                onClick={() => {
                  setPaidOrderId(null);
                  navigate("/orders?tab=TO_SHIP");
                }}
                className="btn-lux flex-1 py-3 rounded-full text-[12px] font-medium label uppercase"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel: Pay Later (invoice) */}
      {invoiceOrderId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl p-9 w-full max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-luxury-gold/40 text-luxury-gold2 flex items-center justify-center text-3xl">
              ★
            </div>
            <h2 className="font-serif text-3xl text-white mb-2">Order Placed</h2>
            <p className="text-luxury-mut mb-7">
              Your order #{invoiceOrderId} has been created. You can pay later with any available payment method.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => downloadPdf(invoiceOrderId, "invoice_order")}
                className="flex-1 py-3 rounded-full border border-white/15 text-luxury-text hover:border-luxury-gold/40 transition"
              >
                Download Invoice
              </button>
              <button
                onClick={() => {
                  setInvoiceOrderId(null);
                  navigate("/orders?tab=TO_PAY");
                }}
                className="btn-lux flex-1 py-3 rounded-full text-[12px] font-medium label uppercase"
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
