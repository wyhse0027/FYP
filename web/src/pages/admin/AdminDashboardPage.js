import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    quizzes: 0,
    ar: 0,
    reviews: 0,
    retailers: 0,
    payments: 0,
    scentPersonas: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchStats() {
      try {
        setLoading(true);
        const res = await http.get("/admin/dashboard-stats/");
        if (!alive) return;

        setStats((prev) => ({
          ...prev,
          ...res.data,
        }));
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchStats();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        <h1 className="text-3xl font-bold mb-8 text-center">ADMIN DASHBOARD</h1>

        {loading && (
          <div className="text-center mb-6 opacity-80">
            Loading dashboard stats...
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.users}</h2>
            <p className="opacity-70">Users</p>
            <Link
              to="/admin/users"
              className="mt-4 inline-block px-4 py-2 bg-sky-600 rounded-lg hover:bg-sky-700 font-semibold transition"
            >
              Manage Users
            </Link>
          </div>

          {/* Products */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.products}</h2>
            <p className="opacity-70">Products</p>
            <Link
              to="/admin/products"
              className="mt-4 inline-block px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 font-semibold transition"
            >
              Manage Products
            </Link>
          </div>

          {/* Orders */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.orders}</h2>
            <p className="opacity-70">Orders</p>
            <Link
              to="/admin/orders"
              className="mt-4 inline-block px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 font-semibold transition"
            >
              Manage Orders
            </Link>
          </div>

          {/* Payments */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.payments}</h2>
            <p className="opacity-70">Payments</p>
            <Link
              to="/admin/payments"
              className="mt-4 inline-block px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 font-semibold transition"
            >
              Manage Payments
            </Link>
          </div>

          {/* Quiz Management */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.quizzes}</h2>
            <p className="opacity-70">Quizzes</p>
            <Link
              to="/admin/quiz-management"
              className="mt-4 inline-block px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 font-semibold transition"
            >
              Manage Quizzes
            </Link>
          </div>

          {/* Scent Personas */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.scentPersonas}</h2>
            <p className="opacity-70">Scent Personas</p>
            <Link
              to="/admin/scent-personas"
              className="mt-4 inline-block px-4 py-2 bg-pink-600 rounded-lg hover:bg-pink-700 font-semibold transition"
            >
              Manage Scent Personas
            </Link>
          </div>

          {/* AR Management */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.ar}</h2>
            <p className="opacity-70">AR Experiences</p>
            <Link
              to="/admin/ar-management"
              className="mt-4 inline-block px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 font-semibold transition"
            >
              Manage AR
            </Link>
          </div>

          {/* Review Management */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.reviews}</h2>
            <p className="opacity-70">User Reviews</p>
            <Link
              to="/admin/reviews"
              className="mt-4 inline-block px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-700 font-semibold transition"
            >
              Manage Reviews
            </Link>
          </div>

          {/* Retailers Management */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">{stats.retailers}</h2>
            <p className="opacity-70">Retailers</p>
            <Link
              to="/admin/retailers"
              className="mt-4 inline-block px-4 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold transition"
            >
              Manage Retailers
            </Link>
          </div>

          {/* About Management */}
          <div className="bg-white/10 p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-4xl font-bold">About</h2>
            <p className="opacity-70">Site Information</p>
            <Link
              to="/admin/about"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              Manage About Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
