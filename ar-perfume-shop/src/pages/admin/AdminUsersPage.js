// src/pages/admin/AdminUsersPage.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../lib/http";

// ✅ helper to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString();
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [details, setDetails] = useState(null);
  const navigate = useNavigate();

  // Load users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await http.get("/admin/users/");
      setUsers(res.data);
    } catch {
      setErr("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await http.delete(`/admin/users/${id}/`);
      fetchUsers();
    } catch {
      alert("Failed to delete user ❌");
    }
  };

  if (loading) return <div className="p-6 text-white">Loading users…</div>;
  if (err) return <div className="p-6 text-red-500">{err}</div>;

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        {/* 🔙 Back Button with white arrow */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 rounded-full hover:bg-white/10 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-3xl font-bold mb-6">Manage Users</h1>

        <div className="overflow-x-auto bg-white/5 rounded-xl">
          <table className="w-full text-left text-white">
            <thead className="bg-white/10 text-sm">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/10">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.role === "admin" ? "bg-green-600" : "bg-gray-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => setDetails(u)}
                      className="px-3 py-1 bg-sky-600 rounded hover:bg-sky-700 text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {details && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-[#0c1a3a] rounded-2xl p-6 sm:p-8 w-full max-w-4xl max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">
                User Profile — {details.username}
              </h2>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10">
                <div className="flex-shrink-0">
                  {details.avatar ? (
                    <img
                      src={details.avatar}
                      alt={details.username}
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white/20"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gray-600 flex items-center justify-center text-3xl">
                      {details.username?.[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-gray-300">{details.email}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Phone Number</p>
                    <p className="text-gray-300">{details.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Account Role</p>
                    <p className="capitalize text-gray-300">{details.role}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Street Address</p>
                    <p className="text-gray-300">{details.address_line1 || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Postal Code</p>
                    <p className="text-gray-300">{details.postal_code || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">City</p>
                    <p className="text-gray-300">{details.city || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">State</p>
                    <p className="text-gray-300">{details.state || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Country</p>
                    <p className="text-gray-300">{details.country || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Date Joined</p>
                    <p className="text-gray-300">{formatDate(details.date_joined)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Last Login</p>
                    <p className="text-gray-300">{formatDate(details.last_login)}</p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => setDetails(null)}
                  className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-700 font-semibold text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
