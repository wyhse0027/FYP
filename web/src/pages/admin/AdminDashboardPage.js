import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import http from "../../lib/http";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/ar-management", label: "AR Experiences" },
  { to: "/admin/scent-personas", label: "Scent Personas" },
  { to: "/admin/quiz-management", label: "Quizzes" },
  { to: "/admin/retailers", label: "Retailers" },
  { to: "/admin/about", label: "About" },
];

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
  const location = useLocation();

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
    <div className="relative flex min-h-[80vh]">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(50% 30% at 80% 0%,rgba(212,175,55,0.1),transparent 60%)" }}
      />

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/8 p-6 shrink-0 relative z-10">
        <p className="font-serif text-lg tracking-[0.25em] text-white mb-10">Maison Admin</p>
        <p className="label uppercase text-[10px] text-luxury-mut mb-3 px-3">Manage</p>
        <nav className="space-y-1 text-sm">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-r-lg border-l-2 transition ${
                  active
                    ? "bg-luxury-gold/12 text-luxury-champagne border-luxury-gold"
                    : "text-luxury-mut border-transparent hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 sm:px-8 py-8 relative z-10">
        <div className="mb-8">
          <p className="label uppercase text-[11px] text-luxury-gold/80 mb-2">Maison Admin</p>
          <h1 className="font-serif text-4xl text-white">Dashboard</h1>
        </div>

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
      </main>
    </div>
  );
}
