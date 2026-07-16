import React, { useEffect, useState, useMemo } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminToast, AdminConfirm, DataTable, Toolbar, StatusPill,
} from "../../components/admin";
import { Dropdown } from "../../components/ui";

const STATUS_FILTER = [
  { value: "ALL", label: "All statuses" },
  { value: "TO_PAY", label: "To Pay" },
  { value: "TO_SHIP", label: "To Ship" },
  { value: "TO_RECEIVE", label: "To Receive" },
  { value: "TO_RATE", label: "To Rate" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];
const STATUS_OPTIONS = STATUS_FILTER.filter((s) => s.value !== "ALL");

const COLUMNS = [
  { label: "ID" }, { label: "Customer" }, { label: "Order status" },
  { label: "Payment" }, { label: "Total", align: "right" }, { label: "Actions", align: "right" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState("ALL");
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useAdminChrome({ title: "Orders", actions: null, backTo: "/admin/dashboard" });

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    http.get("/admin/orders/")
      .then((res) => setOrders(res.data))
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await http.post(`/admin/orders/${orderId}/update_status/`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      showToast("Order status updated");
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = (orderId) =>
    setConfirmAction({
      title: "Delete Order",
      message: "Delete this order? This cannot be undone.",
      onConfirm: async () => {
        try {
          await http.delete(`/admin/orders/${orderId}/`);
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          showToast("Order deleted");
        } catch {
          showToast("Failed to delete order", "error");
        } finally {
          setConfirmAction(null);
        }
      },
    });

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => {
          if (!search) return true;
          const t = search.trim().toLowerCase();
          return String(o.id).includes(t) || o.user?.username?.toLowerCase().includes(t);
        })
        .filter((o) => (sortStatus === "ALL" ? true : o.status === sortStatus)),
    [orders, search, sortStatus]
  );

  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-2">
      <Toolbar
        search={{ value: search, onChange: setSearch, placeholder: "Search by order ID or customer…" }}
        filters={
          <Dropdown
            value={sortStatus}
            onChange={setSortStatus}
            options={STATUS_FILTER}
            align="right"
            className="fld rounded-full px-5 py-3 text-sm min-w-[180px]"
          />
        }
      />
      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && filtered.length === 0}
        empty="No orders found."
      >
        {filtered.map((o) => (
          <tr key={o.id} className="row">
            <td className="px-6 py-4 text-luxury-mut">#{o.id}</td>
            <td className="px-6 py-4 text-luxury-text">{o.user?.username}</td>
            <td className="px-6 py-4"><StatusPill status={o.status} /></td>
            <td className="px-6 py-4">
              {o.payment
                ? <StatusPill status={o.payment.status} label={`${o.payment.method} · ${o.payment.status}`} />
                : <StatusPill status="UNPAID" label="Unpaid" />}
            </td>
            <td className="px-6 py-4 text-right text-luxury-champagne" style={{ fontVariantNumeric: "tabular-nums" }}>
              RM {o.total ? Number(o.total).toFixed(2) : "0.00"}
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                <Dropdown
                  value={o.status}
                  onChange={(v) => handleStatusChange(o.id, v)}
                  options={STATUS_OPTIONS}
                  align="right"
                  className="fld rounded-full px-3 py-1.5 text-[11px] min-w-[130px]"
                />
                <button
                  onClick={() => handleDelete(o.id)}
                  className="rounded-full px-3 py-1.5 text-[11px] border border-red-500/50 text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {confirmAction && (
        <AdminConfirm
          open
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText="Delete"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {toast && <AdminToast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
