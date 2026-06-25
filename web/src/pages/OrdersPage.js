// src/pages/OrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoCheckmarkCircleOutline,
  IoStarOutline,
  IoDownloadOutline,
} from "react-icons/io5";
import ConfirmModal from "../components/ConfirmModal";
import http from "../lib/http";

const ORDER_TABS = {
  TO_PAY: "TO_PAY",
  TO_SHIP: "TO_SHIP",
  TO_RECEIVE: "TO_RECEIVE",
  TO_RATE: "TO_RATE",
  HISTORY: "HISTORY",
};

const TABS = [
  { key: ORDER_TABS.TO_PAY, label: "To Pay" },
  { key: ORDER_TABS.TO_SHIP, label: "To Ship" },
  { key: ORDER_TABS.TO_RECEIVE, label: "To Receive" },
  { key: ORDER_TABS.TO_RATE, label: "To Rate" },
  { key: ORDER_TABS.HISTORY, label: "History" },
];

const formatMYR = (num) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(Number(num || 0));

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || ORDER_TABS.TO_PAY);

  const [orders, setOrders] = useState([]);
  const [confirm, setConfirm] = useState({ open: false });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await http.get("orders/");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error loading orders:", err?.response || err);
      if (err?.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const changeTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  const filtered = useMemo(() => {
    return orders.filter((o) =>
      tab === ORDER_TABS.HISTORY
        ? ["CANCELLED", "COMPLETED"].includes(o.status)
        : o.status === tab
    );
  }, [orders, tab]);

  const ask = (cfg) => setConfirm({ open: true, ...cfg });
  const close = () => setConfirm({ open: false });

  const doAction = async () => {
    const { type, id } = confirm;
    close();
    if (!id || !type) return;
    try {
      await http.post(`orders/${id}/${type}/`);
      await loadOrders();
    } catch (err) {
      console.error("Order action failed:", err?.response || err);
      const data = err?.response?.data || {};
      const rawMsg = data.detail || data.error || data?.messages?.[0]?.message || "";
      if (
        rawMsg.includes("token_not_valid") ||
        rawMsg.includes("Given token not valid for any token type") ||
        err?.response?.status === 401
      ) {
        alert("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }
      alert(rawMsg || "Action failed, please try again.");
    }
  };

  const handleDownloadPdf = async (orderId, isReceipt) => {
    try {
      const res = await http.get(`orders/${orderId}/receipt-pdf/`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${isReceipt ? "receipt" : "invoice"}_order_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download order PDF failed:", err?.response || err);
      if (err?.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }
      alert("Unable to download PDF. Please try again.");
    }
  };

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.1),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 py-12 md:py-14">
        <h1 className="font-serif text-4xl sm:text-5xl text-white mb-2">My Orders</h1>
        <p className="font-cormorant italic text-xl text-luxury-champagne/70 mb-8">
          Your history with the house.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-6 sm:gap-8 text-[11px] label uppercase mb-8 border-b border-white/8 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`pb-3 whitespace-nowrap transition ${
                tab === t.key
                  ? "text-luxury-champagne border-b border-luxury-gold"
                  : "text-luxury-mut hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-cormorant italic text-2xl text-luxury-champagne/70">
              No orders in this category.
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((o, index) => (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <OrderCard order={o} onAsk={ask} onDownloadPdf={handleDownloadPdf} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <ConfirmModal
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText || "Confirm"}
          cancelText="Cancel"
          onCancel={close}
          onConfirm={doAction}
          variant={confirm.type === "cancel" ? "danger" : "primary"}
        />
      </main>
    </div>
  );
}

/* ----------------------------- Card ----------------------------- */
function OrderCard({ order, onAsk, onDownloadPdf }) {
  const navigate = useNavigate();
  const { id, created_at, items = [], total, status, payment } = order;

  const method = payment?.method || null;
  const pStatus = payment?.status || null;

  const paymentLabel = (() => {
    if (!payment) return "UNPAID";
    if (method === "COD") {
      if (status !== "TO_RATE" && status !== "COMPLETED") return "(Pay on delivery)";
      if (pStatus === "SUCCESS") return "(Collected)";
      if (pStatus === "PENDING") return "(Pay on delivery)";
      if (pStatus === "CANCELLED") return "(Cancelled)";
      return `COD (${pStatus})`;
    }
    if (pStatus === "SUCCESS") return "PAID";
    if (pStatus === "PENDING") return "PENDING";
    if (pStatus === "CANCELLED") return "REFUNDED / CANCELLED";
    if (pStatus === "FAILED") return "PAYMENT FAILED";
    return pStatus || "UNPAID";
  })();

  const isCOD = method === "COD";
  const isPaid = payment?.status === "SUCCESS";
  const codCollected = isCOD && (status === "TO_RATE" || status === "COMPLETED");
  const isReceipt = (!isCOD && isPaid) || codCollected;
  const downloadLabel = isReceipt ? "Receipt" : "Invoice";

  const computedPaymentLabel =
    method === "COD" && !codCollected ? "(Pay on delivery)" : paymentLabel;

  const statusLabel = {
    TO_PAY: "To Pay",
    TO_SHIP: "To Ship",
    TO_RECEIVE: "Shipped",
    TO_RATE: "To Rate",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  }[status] || status;

  const statusClass =
    status === "COMPLETED" || status === "CANCELLED"
      ? "border-white/15 text-luxury-mut"
      : "border-luxury-gold/30 text-luxury-gold2";

  const firstImg =
    items[0]?.product?.card_image || items[0]?.product?.promo_image || null;

  const Pill = ({ onClick, variant = "ghost", children }) => {
    const cls =
      variant === "primary"
        ? "btn-lux"
        : variant === "danger"
        ? "border border-red-500/40 text-red-300 hover:bg-red-500/10"
        : "border border-luxury-gold/40 text-luxury-champagne hover:bg-luxury-gold/10";
    return (
      <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-full text-[10px] label uppercase transition ${cls}`}
      >
        {children}
      </button>
    );
  };

  const actions = () => {
    switch (status) {
      case "TO_PAY":
        return (
          <>
            <Pill variant="primary" onClick={() => navigate(`/checkout?order=${id}`)}>
              Pay Now
            </Pill>
            <Pill
              variant="danger"
              onClick={() =>
                onAsk({
                  type: "cancel",
                  id,
                  title: "Cancel Order?",
                  message: "Are you sure you want to cancel this order?",
                  confirmText: "Cancel Order",
                })
              }
            >
              Cancel
            </Pill>
          </>
        );
      case "TO_SHIP":
        return (
          <Pill
            variant="danger"
            onClick={() =>
              onAsk({
                type: "cancel",
                id,
                title: "Cancel Order?",
                message: "Cancel this order before it is shipped?",
                confirmText: "Cancel Order",
              })
            }
          >
            Cancel
          </Pill>
        );
      case "TO_RECEIVE":
        return (
          <Pill
            onClick={() =>
              onAsk({
                type: "deliver",
                id,
                title: "Confirm Delivery?",
                message: "Confirm the order has been received?",
                confirmText: "Confirm",
              })
            }
          >
            <IoCheckmarkCircleOutline className="inline mr-1" />
            Confirm Delivery
          </Pill>
        );
      case "TO_RATE":
        return (
          <Pill variant="primary" onClick={() => navigate(`/rate/${id}`)}>
            <IoStarOutline className="inline mr-1" />
            Rate Now
          </Pill>
        );
      default:
        return (
          <Pill onClick={() => navigate("/shop")}>Reorder</Pill>
        );
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label uppercase text-[10px] text-luxury-mut">Order #{id}</p>
          <p className="text-sm text-luxury-mut mt-1">
            {new Date(created_at).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-[10px] label uppercase border ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-16 rounded-lg overflow-hidden bg-luxury-panel2 shrink-0">
          {firstImg ? <img src={firstImg} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-xl text-white truncate">
            {items[0]?.product?.name || "Order"}
            {items.length > 1 ? ` + ${items.length - 1} more` : ""}
          </p>
          <p className="text-xs text-luxury-mut mt-0.5">
            {items.reduce((n, it) => n + (it.quantity || 0), 0)} item(s)
            {payment ? ` · ${method} ${computedPaymentLabel}` : ""}
          </p>
        </div>
        <span className="font-cormorant text-2xl text-luxury-champagne whitespace-nowrap">
          {formatMYR(total)}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mt-5 justify-end">
        {actions()}
        <Pill onClick={() => onDownloadPdf(id, !!isReceipt)}>
          <IoDownloadOutline className="inline mr-1" />
          {downloadLabel}
        </Pill>
      </div>
    </div>
  );
}
