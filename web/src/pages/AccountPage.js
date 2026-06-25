// src/pages/AccountPage.jsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  IoPencilOutline,
  IoCubeOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, isAuthed, logout, fetchProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed && !user) fetchProfile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const handleLogout = () => {
    logout?.();
    navigate("/login", { replace: true });
  };

  const menu = [
    {
      to: "/orders?tab=TO_PAY",
      icon: IoCubeOutline,
      label: "My Orders",
      hint: "Track and manage orders",
    },
    {
      to: "/edit-profile",
      icon: IoPencilOutline,
      label: "Edit Profile",
      hint: "Update your details",
    },
    {
      to: "/settings",
      icon: IoSettingsOutline,
      label: "Settings",
      hint: "Security & preferences",
    },
  ];

  // Guest view
  if (!isAuthed) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center px-6">
        <div className="glass rounded-3xl p-9 w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full border border-luxury-gold/40 flex items-center justify-center mb-5 text-luxury-gold2 text-2xl">
            ✦
          </div>
          <h1 className="font-serif text-3xl text-white mb-2">You are not logged in</h1>
          <p className="text-luxury-mut mb-7">Please log in to access your account.</p>
          <Link
            to="/login"
            className="btn-lux inline-block px-9 py-4 rounded-full text-[12px] font-medium label uppercase"
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
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.1),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12 md:py-14">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="glass rounded-3xl p-8 text-center h-fit"
          >
            <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border border-luxury-gold/40 mb-6">
              <img
                src={user.avatar || `https://i.pravatar.cc/300?u=${user.username}`}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="font-serif text-3xl text-white">{user.username}</h2>
            {user.email && <p className="text-sm text-luxury-mut mt-1">{user.email}</p>}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-luxury-gold/30 text-[10px] label uppercase text-luxury-gold2">
              Maison Member
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <h1 className="font-serif text-4xl sm:text-5xl text-white mb-2">My Account</h1>
            <p className="font-cormorant italic text-xl text-luxury-champagne/70 mb-8">
              Everything in one place.
            </p>

            <div className="grid sm:grid-cols-3 gap-5">
              {menu.map(({ to, icon: Icon, label, hint }) => (
                <Link key={label} to={to} className="card glass rounded-2xl p-6 block">
                  <div className="w-12 h-12 rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center mb-4 text-luxury-gold2">
                    <Icon className="text-xl" />
                  </div>
                  <p className="font-serif text-xl text-white">{label}</p>
                  <p className="text-xs text-luxury-mut mt-1">{hint}</p>
                </Link>
              ))}
            </div>

            <div className="glass rounded-2xl p-6 mt-5 flex items-center justify-between">
              <div>
                <p className="font-serif text-xl text-white">Sign out</p>
                <p className="text-xs text-luxury-mut mt-1">End your session on this device</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-7 py-3 rounded-full text-[11px] label uppercase border border-red-500/50 text-red-300 hover:bg-red-500/10 transition"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
