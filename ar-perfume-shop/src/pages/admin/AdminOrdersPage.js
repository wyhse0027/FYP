import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState("ALL");

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
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch {
      alert("Failed to update status");
    }
  };

  // 🔍 Filter + Sort Logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!search) return true;
        const idMatch = String(o.id).includes(search.trim());
        const userMatch = o.user?.username
          ?.toLowerCase()
          .includes(search.trim().toLowerCase());
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
      {/* Back Button */}
      <div className="flex items-center mb-4">
        <Link
          to="/admin/dashboard"
          className="text-white hover:text-sky-400 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-10 h-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">Manage Orders</h2>

      {/* Search + Sort Controls */}
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

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <p className="opacity-75">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-white bg-[#13244d] border border-gray-700 rounded-lg">
            <thead className="bg-[#11255a]">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-gray-600 hover:bg-[#1a2a5a] transition"
                >
                  <td className="p-3">{order.id}</td>
                  <td className="p-3">{order.user?.username}</td>
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
                  <td className="p-3">
                    RM {order.total ? Number(order.total).toFixed(2) : "0.00"}
                  </td>
                  <td className="p-3">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
