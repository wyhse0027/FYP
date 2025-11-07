import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import axios from "axios";
import BASE_URL from "../config/api";

// Status keys aligned with backend
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
  }).format(num);

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || ORDER_TABS.TO_PAY);
  const [orders, setOrders] = useState([]);
  const [confirm, setConfirm] = useState({ open: false });

  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  // redirect guests
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  // Load orders
  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE_URL}orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Error loading orders:", err);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const changeTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  // Filter orders
  const filtered = orders.filter((o) =>
    tab === ORDER_TABS.HISTORY
      ? ["CANCELLED", "COMPLETED"].includes(o.status)
      : o.status === tab
  );

  // Action helpers
  const ask = (cfg) => setConfirm({ open: true, ...cfg });
  const close = () => setConfirm({ open: false });

  const doAction = async () => {
    const { type, id } = confirm;
    close();
    if (!id) return;

    try {
      await axios.post(
        `${BASE_URL}orders/${id}/${type}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadOrders();
    } catch (err) {
      console.error("Order action failed:", err);
      alert("Action failed, please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-2xl py-6 text-[18px] md:text-[19px] lg:text-[20px]">
        <PageHeader title="My Orders" />

        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`py-3 rounded-xl text-lg font-semibold ${
                tab === t.key
                  ? "bg-sky-500 text-white"
                  : "bg-white/10 text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!filtered.length && (
          <div className="text-white/70">No orders in this tab.</div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onAsk={ask} />
          ))}
        </div>

        <ConfirmModal
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText || "Confirm"}
          cancelText="Cancel"
          onCancel={close}
          onConfirm={doAction}
        />
      </div>
    </div>
  );
}

function OrderCard({ order, onAsk }) {
  const navigate = useNavigate();
  const { id, created_at, items, total, status, payment_method } = order;

  const actions = () => {
    switch (status) {
      case "TO_PAY":
        return (
          <>
            <button
              className="bg-sky-500 px-4 py-3 rounded-lg text-lg"
              onClick={() =>
                onAsk({
                  type: "pay",
                  id,
                  title: "Proceed to payment?",
                  message: `Pay ${formatMYR(total)} now?`,
                  confirmText: "Pay",
                })
              }
            >
              PAY
            </button>
            <button
              className="bg-white/10 px-4 py-3 rounded-lg text-lg"
              onClick={() =>
                onAsk({
                  type: "cancel",
                  id,
                  title: "Cancel order?",
                  message: "Are you sure you want to cancel this order?",
                  confirmText: "Cancel Order",
                })
              }
            >
              Cancel
            </button>
          </>
        );
      case "TO_SHIP":
        return (
          <>
            {payment_method === "COD" && (
              <button
                className="bg-white/10 px-4 py-3 rounded-lg text-lg"
                onClick={() =>
                  onAsk({
                    type: "cancel",
                    id,
                    title: "Cancel COD order?",
                    message: "Cancel COD order before shipping?",
                    confirmText: "Cancel Order",
                  })
                }
              >
                Cancel
              </button>
            )}
            <button
              className="bg-emerald-600 px-4 py-3 rounded-lg text-lg"
              onClick={() =>
                onAsk({
                  type: "ship",
                  id,
                  title: "Mark as shipped?",
                  message: "Has this order been shipped?",
                  confirmText: "Mark Shipped",
                })
              }
            >
              Mark Shipped
            </button>
          </>
        );
      case "TO_RECEIVE":
        return (
          <button
            className="bg-emerald-600 px-4 py-3 rounded-lg text-lg"
            onClick={() =>
              onAsk({
                type: "deliver",
                id,
                title: "Confirm delivery?",
                message: "Confirm the order has been received?",
                confirmText: "Confirm",
              })
            }
          >
            Confirm Delivery
          </button>
        );
      case "TO_RATE":
        return (
          <button
            className="bg-amber-500 px-4 py-3 rounded-lg text-lg"
            onClick={() => navigate(`/rate/${id}`)}
          >
            Rate now
          </button>
        );
      default:
        return (
          <a href="/" className="underline opacity-80">
            Reorder
          </a>
        );
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-5 text-white">
      <div className="flex justify-between items-center mb-2">
        <div className="text-white/80">
          <div className="text-sm opacity-80">
            {new Date(created_at).toLocaleString()}
          </div>
          <div className="font-semibold">Order #{id}</div>
        </div>
        <div className="text-2xl font-extrabold">{formatMYR(total)}</div>
      </div>

      <ul className="text-white/80 text-lg mb-4 list-disc pl-6 leading-relaxed">
        {items.slice(0, 3).map((it) => (
          <li key={it.id}>
            {it.product?.name} × {it.quantity}
          </li>
        ))}
        {items.length > 3 && <li>+ {items.length - 3} more…</li>}
      </ul>

      <div className="flex gap-3 flex-wrap">{actions()}</div>
    </div>
  );
}
