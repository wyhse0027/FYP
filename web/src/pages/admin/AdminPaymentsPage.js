import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminToast,
  DataTable,
  StatusPill,
  Toolbar,
} from "../../components/admin";
import { Dropdown } from "../../components/ui";

const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED"];

const STATUS_FILTER = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const METHOD_FILTER = [
  { value: "ALL", label: "All methods" },
  { value: "COD", label: "COD" },
  { value: "CARD", label: "Card" },
  { value: "FPX", label: "FPX" },
  { value: "E_WALLET", label: "E-Wallet" },
];

const STATUS_OPTIONS = PAYMENT_STATUSES.map((s) => ({ value: s, label: s }));

const COLUMNS = [
  { label: "ID" },
  { label: "Order" },
  { label: "User" },
  { label: "Method" },
  { label: "Amount", align: "right" },
  { label: "Status" },
  { label: "Txn ID" },
  { label: "Created" },
  { label: "Actions", align: "right" },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useAdminChrome({ title: "Payments", actions: null, backTo: "/admin/dashboard" });

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

      showToast("Receipt downloaded");
    } catch (err) {
      console.error("Failed to download receipt:", err);
      showToast("Failed to download receipt", "error");
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    setUpdatingId(paymentId);
    try {
      await http.patch(`/admin/payments/${paymentId}/`, { status: newStatus });
      showToast(`Status updated to ${newStatus}`);
      await loadPayments();
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Failed to update status", "error");
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
          showToast("Payment deleted");
        } catch (err) {
          if (err?.response?.status === 404) {
            console.warn("Payment already deleted on server");
            showToast("Payment already deleted (refreshed)", "success");
          } else {
            console.error("Failed to delete payment:", err);
            showToast("Failed to delete payment", "error");
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
    <div className="space-y-2">
      <Toolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search by order, user, tx id…" }}
        filters={
          <div className="flex flex-col sm:flex-row gap-3">
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER}
              align="right"
              className="fld rounded-full px-5 py-3 text-sm min-w-[170px]"
            />
            <Dropdown
              value={methodFilter}
              onChange={setMethodFilter}
              options={METHOD_FILTER}
              align="right"
              className="fld rounded-full px-5 py-3 text-sm min-w-[150px]"
            />
          </div>
        }
      />

      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && filtered.length === 0}
        empty="No payments found."
        minWidth={1080}
      >
        {filtered.map((p) => {
          const order = p.order;
          const user = order?.user;

          return (
            <tr key={p.id} className="row">
              <td className="px-6 py-4 text-luxury-mut">#{p.id}</td>
              <td className="px-6 py-4">
                {order ? (
                  <Link
                    to={`/admin/orders?highlight=${order.id}`}
                    className="text-luxury-gold2 hover:text-luxury-champagne"
                  >
                    #{order.id}
                  </Link>
                ) : (
                  <span className="text-luxury-mut">-</span>
                )}
              </td>
              <td className="px-6 py-4">
                {user ? (
                  <>
                    <div className="text-luxury-text">{user.username}</div>
                    <div className="text-xs text-luxury-mut">{user.email}</div>
                  </>
                ) : (
                  <span className="text-luxury-mut">-</span>
                )}
              </td>
              <td className="px-6 py-4"><StatusPill status={p.method} label={p.method || "-"} /></td>
              <td className="px-6 py-4 text-right text-luxury-champagne" style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.amount ? Number(p.amount).toFixed(2) : "0.00"}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <StatusPill status={p.status} />
                  <Dropdown
                    value={p.status}
                    onChange={(v) => {
                      if (updatingId !== p.id) handleStatusChange(p.id, v);
                    }}
                    options={STATUS_OPTIONS}
                    align="right"
                    className={`fld rounded-full px-3 py-1.5 text-[11px] min-w-[130px] ${updatingId === p.id ? "opacity-40 pointer-events-none" : ""}`}
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="max-w-[160px] truncate text-xs text-luxury-mut">
                  {p.transaction_id || "-"}
                </div>
              </td>
              <td className="px-6 py-4 text-xs text-luxury-mut">
                {p.created_at
                  ? new Date(p.created_at).toLocaleString()
                  : "-"}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDownloadReceipt(p)}
                    className="ghost rounded-full px-3 py-1.5 text-[11px]"
                  >
                    Receipt
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={updatingId === p.id}
                    className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>

      {toast && (
        <AdminToast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmAction && (
        <AdminConfirm
          open
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText="Delete"
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </div>
  );
}
