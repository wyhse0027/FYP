// src/pages/AccountPage.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import {
  IoPencilOutline,
  IoCubeOutline,
  IoSettingsOutline,
  IoLogOutOutline,
} from "react-icons/io5";
import http from "../lib/http"; // axios wrapper with JWT
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const [profile, setProfile] = useState(null);
  const { logout, isAuthed } = useAuth();
  const navigate = useNavigate();

  // Fetch logged-in user info
  useEffect(() => {
    if (isAuthed) {
      http
        .get("me/") // backend endpoint for current user
        .then((res) => setProfile(res.data))
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setProfile(null);
        });
    }
  }, [isAuthed]);

  const handleLogout = () => {
    try {
      logout?.();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const menu = [
    { to: "/orders?tab=TO_PAY", icon: IoCubeOutline, label: "My Orders" },
    { to: "/edit-profile", icon: IoPencilOutline, label: "Edit Profile" },
    { to: "/settings", icon: IoSettingsOutline, label: "Account Settings" },
  ];

  // Guest view
  if (!isAuthed) {
    return (
      <div className="min-h-screen w-full bg-[#0c1a3a] flex flex-col items-center justify-center text-white px-6">
        <h1 className="text-3xl font-bold mb-4">You are not logged in</h1>
        <p className="mb-6 opacity-80">Please log in to access your account.</p>
        <Link
          to="/login"
          className="px-6 py-3 bg-sky-500 rounded-xl font-semibold hover:bg-sky-600 transition"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Loading state
  if (!profile) {
    return <div className="text-white p-6">Loading account...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-[1600px] py-8 text-white">
        <PageHeader title="ACCOUNT" />

        <div className="grid lg:grid-cols-3 gap-10 items-stretch">
          {/* LEFT — avatar + username */}
          <section className="bg-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[640px]">
            <div className="relative w-[320px] h-[320px] xl:w-[360px] xl:h-[360px] rounded-full overflow-hidden border-8 border-white/80 shadow-2xl">
              <img
                src={
                  profile.avatar ||
                  "https://i.pravatar.cc/600?u=" + profile.username
                }
                alt="User avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 bg-black/50 backdrop-blur px-6 py-2 rounded-full font-bold">
                {profile.username}
              </div>
            </div>
          </section>

          {/* RIGHT — tiles */}
          <section className="lg:col-span-2 bg-white/5 rounded-2xl p-8 min-h-[640px] flex flex-col">
            <div className="w-full grid grid-rows-3 gap-6 flex-1">
              {menu.map(({ to, icon: Icon, label }) => (
                <Link
                  key={label}
                  to={to}
                  aria-label={label}
                  className="group h-28 md:h-32 flex items-center justify-center gap-5 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-400/30"
                >
                  <Icon className="text-4xl md:text-5xl text-white/90 group-hover:text-white" />
                  <span className="text-2xl md:text-3xl font-semibold tracking-wide">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* BIG Logout CTA */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log Out"
              className="mt-6 w-full h-20 md:h-24 rounded-2xl bg-rose-600/90 hover:bg-rose-500 transition-colors shadow-md
                         flex items-center justify-center gap-4 focus:outline-none focus:ring-4 focus:ring-rose-400/40"
            >
              <IoLogOutOutline className="text-3xl md:text-4xl" />
              <span className="text-xl md:text-2xl font-bold">Log Out</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
