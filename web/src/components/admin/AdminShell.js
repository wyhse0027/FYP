import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AdminChromeProvider,
  useAdminChromeState,
} from "../../context/AdminChromeContext";

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

function TopBar() {
  const { title, actions, backTo } = useAdminChromeState();
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-20 backdrop-blur-xl bg-luxury-bg/70 border-b border-luxury-gold/15">
      <div className="px-6 sm:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {backTo !== null && (
            <button
              onClick={() => (backTo === -1 ? navigate(-1) : navigate(backTo))}
              className="ghost w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
              aria-label="Back"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          )}
          <h1 className="font-serif text-2xl text-white truncate">{title}</h1>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export default function AdminShell() {
  const location = useLocation();
  return (
    <AdminChromeProvider>
      <div className="relative flex min-h-[80vh]">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "radial-gradient(50% 30% at 82% 0%,rgba(212,175,55,0.10),transparent 60%)" }}
        />
        <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 p-6 shrink-0 relative z-10">
          <p className="font-serif text-lg tracking-[0.25em] text-white mb-1">Maison</p>
          <p className="label uppercase text-[11px] text-luxury-gold/80 mb-9">Admin</p>
          <p className="label uppercase text-[10px] text-luxury-mut mb-3 px-3">Manage</p>
          <nav className="space-y-1 text-sm">
            {NAV.map((n) => {
              const active = location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`block px-3 py-2.5 rounded-r-lg border-l-2 transition ${
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
        <main className="flex-1 relative z-10 min-w-0">
          <TopBar />
          <div className="px-6 sm:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminChromeProvider>
  );
}
