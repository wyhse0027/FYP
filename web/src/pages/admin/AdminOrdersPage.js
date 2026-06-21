import React, { useEffect, useState, useMemo } from "react";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";

function Toast({ message, type = "success", onClose }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm shadow-lg z-50 ${
        type === "error" ? "bg-red-600" : "bg-green-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1e293b] text-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold mb-3">{title}</h2>
        <p className="text-white/80 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Payment display helpers
const PAYMENT_STATUS_COLORS = {
  PENDING: "text-yellow-300",
  SUCCESS: "text-emerald-300",
  FAILED: "text-rose-300",
  CANCELLED: "text-rose-300",
};

const PAYMENT_METHOD_COLORS = {
  COD: "bg-slate-700",
  CARD: "bg-blue-700",
  FPX: "bg-indigo-700",
  E_WALLET: "bg-purple-700",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState("ALL");
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    http
      .get("/admin/orders/")
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await http.post(`/admin/orders/${orderId}/update_status/`, {
        status: newStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast("Order status updated ✅");
    } catch {
      showToast("Failed to update status ❌", "error");
    }
  };

  // 🔥 Confirm + Delete
  const handleDelete = (orderId) => {
    setConfirmAction({
      title: "Delete Order",
      message:
        "Are you sure you want to delete this order? This cannot be undone.",
      onConfirm: async () => {
        try {
          await http.delete(`/admin/orders/${orderId}/`);
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          showToast("Order deleted successfully ✅");
        } catch {
          showToast("Failed to delete order ❌", "error");
        } finally {
          setConfirmAction(null);
        }
      },
    });
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!search) return true;
        const term = search.trim().toLowerCase();
        const idMatch = String(o.id).includes(term);
        const userMatch = o.user?.username
          ?.toLowerCase()
          .includes(term);
        return idMatch || userMatch;
      })
      .filter((o) => (sortStatus === "ALL" ? true : o.status === sortStatus));
  }, [orders, search, sortStatus]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#0c1a3a] text-white flex items-center justify-center">
        Loading orders...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[#0c1a3a] text-white flex items-center justify-center">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 py-6">
      <div className="px-6 md:px-12">
        <PageHeader title="Orders Management" />
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="Search by Order ID or Username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-md bg-[#1a2a5a] text-white border border-gray-600 w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <select
          value={sortStatus}
          onChange={(e) => setSortStatus(e.target.value)}
          className="px-4 py-2 rounded-md bg-[#1a2a5a] text-white border border-gray-600 w-full md:w-1/4 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="ALL">All Status</option>
          <option value="TO_PAY">To Pay</option>
          <option value="TO_SHIP">To Ship</option>
          <option value="TO_RECEIVE">To Receive</option>
          <option value="TO_RATE">To Rate</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <p className="opacity-75">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-white bg-[#13244d] border border-gray-700 rounded-lg">
            <thead className="bg-[#11255a]">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Order Status</th>
                <th className="p-3 text-left">Payment</th>{/* NEW */}
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const payment = order.payment || null;
                const method = payment?.method || null;
                const pStatus = payment?.status || null;

                const methodPill =
                  PAYMENT_METHOD_COLORS[method] || "bg-gray-700";
                const statusText =
                  PAYMENT_STATUS_COLORS[pStatus] || "text-white/70";

                return (
                  <tr
                    key={order.id}
                    className="border-t border-gray-600 hover:bg-[#1a2a5a] transition"
                  >
                    <td className="p-3">{order.id}</td>
                    <td className="p-3">{order.user?.username}</td>

                    {/* Order status */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-md text-sm font-semibold ${
                          order.status === "TO_PAY"
                            ? "bg-yellow-600"
                            : order.status === "TO_SHIP"
                            ? "bg-blue-600"
                            : order.status === "TO_RECEIVE"
                            ? "bg-indigo-600"
                            : order.status === "TO_RATE"
                            ? "bg-orange-600"
                            : order.status === "COMPLETED"
                            ? "bg-green-700"
                            : "bg-red-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* ✅ Payment column */}
                    <td className="p-3 pr-12">
                      {payment ? (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`${methodPill} inline-flex items-center justify-center px-2 py-1 rounded-full text-xs`}
                          >
                            {method}
                          </span>
                          <span
                            className={`text-xs font-semibold ${statusText}`}
                          >
                            {pStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-white/60">UNPAID</span>
                      )}
                    </td>

                    <td className="p-3">
                      RM{" "}
                      {order.total ? Number(order.total).toFixed(2) : "0.00"}
                    </td>
                    <td className="p-3">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          className="bg-[#1a2a5a] text-white border border-gray-500 rounded-md p-1"
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                        >
                          <option>TO_PAY</option>
                          <option>TO_SHIP</option>
                          <option>TO_RECEIVE</option>
                          <option>TO_RATE</option>
                          <option>COMPLETED</option>
                          <option>CANCELLED</option>
                        </select>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals & Toasts */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
