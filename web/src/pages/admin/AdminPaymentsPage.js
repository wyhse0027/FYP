import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";

const STATUS_COLORS = {
  PENDING: "text-yellow-400",
  SUCCESS: "text-green-400",
  FAILED: "text-red-400",
  CANCELLED: "text-red-400",
};

const METHOD_COLORS = {
  COD: "bg-slate-700",
  CARD: "bg-blue-700",
  FPX: "bg-indigo-700",
  E_WALLET: "bg-purple-700",
};

const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED"];

function Toast({ message, type = "success", onClose }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm shadow-lg z-50 ${
        type === "error" ? "bg-red-600" : "bg-green-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadPayments = async () => {
    try {
      const res = await http.get("/admin/payments/");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];
      setPayments(data);
    } catch (err) {
      console.error("Failed to load payments:", err);
      showToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
        if (methodFilter !== "ALL" && p.method !== methodFilter) return false;

        if (search) {
          const q = search.toLowerCase();
          const hay = [
            p.id,
            p.order?.id,
            p.order?.user?.username,
            p.order?.user?.email,
            p.transaction_id,
            p.method,
            p.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }

        return true;
      }),
    [payments, statusFilter, methodFilter, search]
  );

  const handleDownloadReceipt = async (payment) => {
    const orderId = payment.order?.id;
    if (!orderId) {
      showToast("No related order for this payment", "error");
      return;
    }

    try {
      const res = await http.get(`/orders/${orderId}/receipt-pdf/`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast("Receipt downloaded ✅");
    } catch (err) {
      console.error("Failed to download receipt:", err);
      showToast("Failed to download receipt ❌", "error");
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    setUpdatingId(paymentId);
    try {
      await http.patch(`/admin/payments/${paymentId}/`, { status: newStatus });
      showToast(`Status updated to ${newStatus} ✅`);
      await loadPayments();
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Failed to update status ❌", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (payment) => {
    setConfirmAction({
      title: "Delete Payment",
      message:
        "Are you sure you want to delete this payment record? This cannot be undone.",
      onConfirm: async () => {
        setUpdatingId(payment.id);
        try {
          await http.delete(`/admin/payments/${payment.id}/`);
          showToast("Payment deleted ✅");
        } catch (err) {
          if (err?.response?.status === 404) {
            console.warn("Payment already deleted on server");
            showToast("Payment already deleted (refreshed)", "success");
          } else {
            console.error("Failed to delete payment:", err);
            showToast("Failed to delete payment ❌", "error");
            setUpdatingId(null);
            setConfirmAction(null);
            return;
          }
        }

        await loadPayments();
        setUpdatingId(null);
        setConfirmAction(null);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-8">
        <PageHeader title="Payments Management" />

        {/* Filters */}
        <div className="bg-white/5 p-4 rounded-xl mb-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0f172a] text-white text-sm px-3 py-1.5 rounded-lg border border-white/10"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-[#0f172a] text-white text-sm px-3 py-1.5 rounded-lg border border-white/10"
              >
                <option value="ALL">All</option>
                <option value="COD">COD</option>
                <option value="CARD">Card</option>
                <option value="FPX">FPX</option>
                <option value="E_WALLET">E-Wallet</option>
              </select>
            </div>
          </div>

          <div className="mt-2 md:mt-0">
            <input
              type="text"
              placeholder="Search by order, user, tx id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72 bg-[#0f172a] text-white text-sm px-3 py-2 rounded-lg border border-white/10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10 uppercase text-xs text-white/70">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-right">Amount (RM)</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Txn ID</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-white/60"
                    >
                      Loading payments…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-white/60"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const order = p.order;
                    const user = order?.user;
                    const statusColor =
                      STATUS_COLORS[p.status] || "text-white";
                    const methodPill =
                      METHOD_COLORS[p.method] || "bg-gray-700";

                    return (
                      <tr
                        key={p.id}
                        className="border-t border-white/5 hover:bg-white/5"
                      >
                        <td className="px-3 py-2 align-top">{p.id}</td>
                        <td className="px-3 py-2 align-top">
                          {order ? (
                            <Link
                              to={`/admin/orders?highlight=${order.id}`}
                              className="text-sky-400 hover:underline"
                            >
                              #{order.id}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {user ? (
                            <>
                              <div>{user.username}</div>
                              <div className="text-xs text-white/50">
                                {user.email}
                              </div>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`${methodPill} text-xs px-2 py-1 rounded-full inline-block text-white text-center`}
                          >
                            {p.method || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          {p.amount ? Number(p.amount).toFixed(2) : "0.00"}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={p.status}
                            disabled={updatingId === p.id}
                            onChange={(e) =>
                              handleStatusChange(p.id, e.target.value)
                            }
                            className={`bg-black/40 text-xs px-2 py-1 rounded-full ${statusColor}`}
                          >
                            {PAYMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="max-w-[160px] truncate text-xs text-white/80">
                            {p.transaction_id || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-white/60">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-right space-x-2">
                          <button
                            onClick={() => handleDownloadReceipt(p)}
                            className="text-xs px-2 py-1 rounded bg-sky-600/90 hover:bg-sky-700"
                          >
                            Receipt
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={updatingId === p.id}
                            className="text-xs px-2 py-1 rounded bg-red-600/80 hover:bg-red-700 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.msg}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            onCancel={() => setConfirmAction(null)}
            onConfirm={confirmAction.onConfirm}
          />
        )}
      </div>
    </div>
  );
}
