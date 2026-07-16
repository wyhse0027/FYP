// src/pages/admin/AdminUsersPage.js
import { useEffect, useState } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminModal,
  AdminToast,
  DataTable,
  StatusPill,
} from "../../components/admin";

// Helper to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString();
};

const COLUMNS = [
  { label: "ID" },
  { label: "Username" },
  { label: "Email" },
  { label: "Role" },
  { label: "Actions", align: "right" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [details, setDetails] = useState(null);

  // Confirmation + toast state
  const [confirmUser, setConfirmUser] = useState(null);
  const [toast, setToast] = useState(null);

  useAdminChrome({ title: "Users", actions: null, backTo: "/admin/dashboard" });

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // Load users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await http.get("/admin/users/");
      setUsers(res.data);
      setErr("");
    } catch {
      setErr("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real delete logic (called from confirm modal)
  const handleDelete = async () => {
    if (!confirmUser) return;
    try {
      await http.delete(`/admin/users/${confirmUser.id}/`);
      setConfirmUser(null);
      showToast("success", "User deleted successfully.");
      fetchUsers();
    } catch {
      showToast("error", "Failed to delete user.");
    }
  };

  if (err) return <p className="text-red-300 text-sm">{err}</p>;

  return (
    <div className="space-y-2">
      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && users.length === 0}
        empty="No users found."
      >
        {users.map((u) => (
          <tr key={u.id} className="row">
            <td className="px-6 py-4 text-luxury-mut">#{u.id}</td>
            <td className="px-6 py-4 text-luxury-text">{u.username}</td>
            <td className="px-6 py-4 text-luxury-mut">{u.email}</td>
            <td className="px-6 py-4">
              <StatusPill status={u.is_staff === true ? "ADMIN" : "USER"} label={u.role} />
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDetails(u)}
                  className="ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  View
                </button>
                <button
                  onClick={() => setConfirmUser(u)}
                  className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {details && (
        <AdminModal
          open
          title={`User Profile — ${details.username}`}
          onClose={() => setDetails(null)}
          size="lg"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10">
            <div className="flex-shrink-0">
              {details.avatar ? (
                <img
                  src={details.avatar}
                  alt={details.username}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border border-luxury-gold/30"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full glass flex items-center justify-center text-3xl text-luxury-champagne">
                  {details.username?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Email</p>
                <p className="text-luxury-text">{details.email}</p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Phone Number</p>
                <p className="text-luxury-text">
                  {details.phone || "Not provided"}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Account Role</p>
                <p className="capitalize text-luxury-text">{details.role}</p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Street Address</p>
                <p className="text-luxury-text">
                  {details.address_line1 || "Not provided"}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Postal Code</p>
                <p className="text-luxury-text">
                  {details.postal_code || "—"}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">City</p>
                <p className="text-luxury-text">{details.city || "—"}</p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">State</p>
                <p className="text-luxury-text">{details.state || "—"}</p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Country</p>
                <p className="text-luxury-text">{details.country || "—"}</p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Date Joined</p>
                <p className="text-luxury-text">
                  {formatDate(details.date_joined)}
                </p>
              </div>
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">Last Login</p>
                <p className="text-luxury-text">
                  {formatDate(details.last_login)}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setDetails(null)}
              className="ghost rounded-full px-6 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </AdminModal>
      )}

      {confirmUser && (
        <AdminConfirm
          open
          title="Delete User"
          message={`Are you sure you want to delete user ${confirmUser.username} (ID: ${confirmUser.id})? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmUser(null)}
        />
      )}

      {toast && (
        <AdminToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
