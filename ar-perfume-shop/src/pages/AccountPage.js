// src/pages/AccountPage.jsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/PageHeader";
import {
  IoPencilOutline,
  IoCubeOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoSparkles,
  IoClose,
} from "react-icons/io5";
import { useAuth } from "../context/AuthContext";

function Toast({ message, type = "success", onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[60] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm ${
        type === "error"
          ? "bg-red-500/90 border-red-400/30"
          : "bg-emerald-500/90 border-emerald-400/30"
      } text-white`}
    >
      <div className="flex items-center gap-3">
        <IoSparkles className="text-xl" />
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white ml-2">
          <IoClose className="text-xl" />
        </button>
      </div>
    </motion.div>
  );
}

export default function AccountPage() {
  const { user, isAuthed, logout, fetchProfile } = useAuth();
  const navigate = useNavigate();

  // If authed but user not loaded yet, fetch it
  useEffect(() => {
    if (isAuthed) fetchProfile?.();   // ✅ always refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  useEffect(() => {
    console.log("Account user:", user);
  }, [user]);

  const handleLogout = () => {
    logout?.();
    navigate("/login", { replace: true });
  };

  const menu = [
    { to: "/orders?tab=TO_PAY", icon: IoCubeOutline, label: "My Orders" },
    { to: "/edit-profile", icon: IoPencilOutline, label: "Edit Profile" },
    { to: "/settings", icon: IoSettingsOutline, label: "Account Settings" },
  ];

  // Guest view
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-luxury-navy flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 text-white text-center backdrop-blur-sm">
          <div className="text-luxury-gold text-4xl mb-3">✨</div>
          <h1 className="text-2xl font-bold mb-2 text-luxury-gold">You are not logged in</h1>
          <p className="text-luxury-silver mb-6">Please log in to access your account.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-luxury-gold to-luxury-gold/80 text-luxury-navy rounded-2xl font-bold shadow-lg shadow-luxury-gold/20"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-luxury-navy flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 mx-auto mb-4 border-2 border-luxury-gold border-t-transparent rounded-full"
          />
          <p className="text-luxury-silver">Loading account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-navy text-white relative overflow-hidden">
      {/* Background glow (same vibe as ProductPage) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[640px] h-[640px] bg-luxury-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-luxury-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
        <div className="max-w-screen-2xl mx-auto py-6">
          <PageHeader title="ACCOUNT" backTo="/" />
        </div>

        <div className="max-w-screen-2xl mx-auto pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* LEFT card */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative w-56 h-56 rounded-full overflow-hidden border border-luxury-gold/30 shadow-2xl">
                  <img
                    src={user.avatar || `https://i.pravatar.cc/600?u=${user.username}`}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                <h2 className="mt-6 text-3xl font-bold text-luxury-gold">{user.username}</h2>
                {user.email && <p className="mt-2 text-luxury-silver text-sm">{user.email}</p>}

                <div className="mt-6 w-full bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-luxury-silver text-sm leading-relaxed">
                    Manage your profile, orders, and settings from one place.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* RIGHT menu */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm flex flex-col"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-luxury-gold">Quick Actions</h3>
                <p className="text-luxury-silver text-sm mt-1">
                  Tap a card to continue.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1">
                {menu.map(({ to, icon: Icon, label }, idx) => (
                  <Link
                    key={label}
                    to={to}
                    className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-luxury-gold/30 rounded-3xl p-6 transition-all duration-300 shadow-lg shadow-black/20"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center mb-4">
                      <Icon className="text-2xl text-luxury-gold" />
                    </div>
                    <div className="text-lg font-semibold text-white group-hover:text-luxury-gold transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-luxury-silver mt-2">
                      {idx === 0
                        ? "Track and manage your orders"
                        : idx === 1
                        ? "Update your profile details"
                        : "Security & account preferences"}
                    </div>
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 w-full py-4 rounded-2xl bg-red-500/80 hover:bg-red-500 transition-all duration-300 font-bold flex items-center justify-center gap-3"
              >
                <IoLogOutOutline className="text-2xl" />
                Log Out
              </button>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
