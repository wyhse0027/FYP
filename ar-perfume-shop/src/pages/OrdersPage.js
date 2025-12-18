// src/pages/OrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoCubeOutline,
  IoRocketOutline,
  IoCheckmarkCircleOutline,
  IoStarOutline,
  IoTimeOutline,
  IoDownloadOutline,
  IoCloseCircleOutline,
  IoCardOutline,
  IoReceiptOutline,
} from "react-icons/io5";
import PageHeader from "../components/PageHeader";
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
  { key: ORDER_TABS.TO_PAY, label: "To Pay", icon: IoCardOutline },
  { key: ORDER_TABS.TO_SHIP, label: "To Ship", icon: IoCubeOutline },
  { key: ORDER_TABS.TO_RECEIVE, label: "To Receive", icon: IoRocketOutline },
  { key: ORDER_TABS.TO_RATE, label: "To Rate", icon: IoStarOutline },
  { key: ORDER_TABS.HISTORY, label: "History", icon: IoTimeOutline },
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

  // Auth check + load orders on tab change
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
      const status = err?.response?.status;
      if (status === 401) {
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

  // Confirm modal helpers
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
      const rawMsg =
        data.detail || data.error || data?.messages?.[0]?.message || "";

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

  // Download Invoice / Receipt PDF
  const handleDownloadPdf = async (orderId, isReceipt) => {
    try {
      const res = await http.get(`orders/${orderId}/receipt-pdf/`, {
        responseType: "blob",
      });

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
      const status = err?.response?.status;
      if (status === 401) {
        alert("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }
      alert("Unable to download PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-luxury-navy/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-luxury-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="max-w-screen-2xl mx-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <PageHeader title="My Orders" />
          </motion.div>

          {/* Luxury Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            {TABS.map((t, index) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <motion.button
                  key={t.key}
                  onClick={() => changeTab(t.key)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
                    border backdrop-blur-md
                    ${
                      isActive
                        ? "text-slate-900 border-luxury-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.35)]"
                        : "bg-white/10 text-white/90 border-white/20 shadow-[0_0_18px_rgba(255,255,255,0.10)] hover:bg-white/15 hover:border-white/30 hover:shadow-[0_0_22px_rgba(255,255,255,0.16)]"
                    }`}
                >
                  <Icon className="text-xl" />
                  <span>{t.label}</span>

                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-luxury-gold to-luxury-gold-light rounded-xl -z-10"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-2 border-luxury-gold border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-luxury-gold/20">
                <IoCubeOutline className="text-4xl text-luxury-gold/50" />
              </div>
              <p className="text-white/60 text-lg">No orders in this category</p>
            </motion.div>
          )}

          {/* Order Cards Grid */}
          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((o, index) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, scale: 0.92, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -18 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                  >
                    <OrderCard
                      order={o}
                      onAsk={ask}
                      onDownloadPdf={handleDownloadPdf}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
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
        </div>
      </div>
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

  const paymentBadgeClass = (() => {
    if (paymentLabel.includes("PAID") || paymentLabel.includes("Collected"))
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (
      paymentLabel.includes("PENDING") ||
      paymentLabel.includes("Pay on delivery")
    )
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (
      paymentLabel.includes("CANCELLED") ||
      paymentLabel.includes("REFUNDED") ||
      paymentLabel.includes("FAILED")
    )
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    return "bg-white/10 text-white/70 border-white/10";
  })();

  const isReceipt = payment && payment.status === "SUCCESS";
  const downloadLabel = isReceipt ? "Receipt" : "Invoice";

  const ActionButton = ({ onClick, variant = "default", children }) => {
    const variantClasses = {
      primary:
        "bg-gradient-to-r from-luxury-gold to-luxury-gold-light text-slate-900 shadow-lg shadow-luxury-gold/20",
      danger:
        "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30",
      success:
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30",
      default:
        "bg-white/10 text-white/80 border border-white/10 hover:bg-white/20",
    };

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`px-4 py-2.5 rounded-xl font-medium transition-all ${variantClasses[variant]}`}
      >
        {children}
      </motion.button>
    );
  };

  const actions = () => {
    switch (status) {
      case "TO_PAY":
        return (
          <>
            <ActionButton
              variant="primary"
              onClick={() => navigate(`/checkout?order=${id}`)}
            >
              Pay Now
            </ActionButton>
            <ActionButton
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
            </ActionButton>
          </>
        );

      case "TO_SHIP":
        return (
          <>
            <ActionButton
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
            </ActionButton>
            <ActionButton
              variant="success"
              onClick={() =>
                onAsk({
                  type: "ship",
                  id,
                  title: "Mark as Shipped?",
                  message: "Mark this order as shipped?",
                  confirmText: "Mark Shipped",
                })
              }
            >
              Mark Shipped
            </ActionButton>
          </>
        );

      case "TO_RECEIVE":
        return (
          <ActionButton
            variant="success"
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
          </ActionButton>
        );

      case "TO_RATE":
        return (
          <ActionButton variant="primary" onClick={() => navigate(`/rate/${id}`)}>
            <IoStarOutline className="inline mr-1" />
            Rate Now
          </ActionButton>
        );

      default:
        return (
          <ActionButton variant="default" onClick={() => navigate("/")}>
            Reorder
          </ActionButton>
        );
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-2xl p-6 border border-white/10 hover:border-luxury-gold/30 transition-all duration-300"
    >
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-2xl">
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-luxury-gold/20 to-transparent rotate-45" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm text-white/50 mb-1">
            {new Date(created_at).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="font-semibold text-lg text-white flex items-center gap-2">
            <IoReceiptOutline className="text-luxury-gold" />
            Order #{id}
          </div>

          {/* Payment Badge */}
          {status !== "TO_PAY" ? (
            <div
              className={`mt-2 inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${paymentBadgeClass}`}
            >
              {payment ? `${method} · ${paymentLabel}` : paymentLabel}
            </div>
          ) : (
            payment &&
            (payment.status === "FAILED" || payment.status === "CANCELLED") && (
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <IoCloseCircleOutline />
                Payment Failed — Try Again
              </div>
            )
          )}
        </div>

        {/* Total */}
        <div className="text-right">
          <div className="text-xs text-white/50 mb-1">Total</div>
          <div className="text-2xl font-bold bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
            {formatMYR(total)}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
        <ul className="space-y-2">
          {items.slice(0, 3).map((it) => (
            <li key={it.id} className="flex justify-between text-sm">
              <span className="text-white/80 truncate flex-1">
                {it.product?.name}
              </span>
              <span className="text-luxury-gold ml-2">×{it.quantity}</span>
            </li>
          ))}
          {items.length > 3 && (
            <li className="text-sm text-white/50 italic">
              + {items.length - 3} more items
            </li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        {actions()}
        <ActionButton variant="default" onClick={() => onDownloadPdf(id, !!isReceipt)}>
          <IoDownloadOutline className="inline mr-1" />
          {downloadLabel}
        </ActionButton>
      </div>
    </motion.div>
  );
}
