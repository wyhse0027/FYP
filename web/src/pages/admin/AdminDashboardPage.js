import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";

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

  useAdminChrome({ title: "Dashboard", actions: null, backTo: null });

  useEffect(() => {
    let alive = true;
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await http.get("/admin/dashboard-stats/");
        if (!alive) return;
        setStats((prev) => ({ ...prev, ...res.data }));
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

  const primary = [
    { label: "Orders", value: stats.orders, to: "/admin/orders" },
    { label: "Products", value: stats.products, to: "/admin/products" },
    { label: "Users", value: stats.users, to: "/admin/users" },
    { label: "Reviews", value: stats.reviews, to: "/admin/reviews" },
  ];

  const manage = [
    { label: "Payments", value: stats.payments, to: "/admin/payments" },
    { label: "Quizzes", value: stats.quizzes, to: "/admin/quiz-management" },
    { label: "Scent Personas", value: stats.scentPersonas, to: "/admin/scent-personas" },
    { label: "AR Experiences", value: stats.ar, to: "/admin/ar-management" },
    { label: "Retailers", value: stats.retailers, to: "/admin/retailers" },
    { label: "About", value: "Site", to: "/admin/about" },
  ];

  return (
    <div className="space-y-8">
      {loading && <p className="text-luxury-mut text-sm mb-6">Loading dashboard stats…</p>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {primary.map((s) => (
          <Link key={s.label} to={s.to} className="card glass rounded-2xl p-6 block">
            <p className="label uppercase text-[10px] text-luxury-mut mb-2">{s.label}</p>
            <p className="font-serif text-3xl text-white">{s.value}</p>
            <p className="text-xs text-luxury-gold2 mt-2 inline-block border-b border-luxury-gold/40">Manage</p>
          </Link>
        ))}
      </div>

      {/* Manage grid */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h2 className="font-serif text-xl text-white">Management</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
          {manage.map((m) => (
            <Link
              key={m.label}
              to={m.to}
              className="bg-luxury-bg/40 hover:bg-white/[0.03] transition px-6 py-5 flex items-center justify-between"
            >
              <div>
                <p className="label uppercase text-[10px] text-luxury-mut mb-1">{m.label}</p>
                <p className="font-serif text-2xl text-white">{m.value}</p>
              </div>
              <span className="text-luxury-gold2 text-sm">✦</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
