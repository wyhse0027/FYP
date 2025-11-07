// src/components/TopNav.js
import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  IoHomeOutline,
  IoRocketOutline,
  IoCartOutline,
  IoPersonOutline,
  IoSettingsOutline, // ⚡ use this for admin
} from "react-icons/io5";
import { useAuth } from "../context/AuthContext";

// Base/active link styles
const linkBase =
  "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors " +
  "text-white/90 hover:text-white hover:bg-white/15 ring-1 ring-transparent text-lg md:text-xl";

const active = "text-sky-100 bg-white/20 ring-white/20";
const navClass = ({ isActive }) => `${linkBase} ${isActive ? active : ""}`;

export default function TopNav() {
  const { user } = useAuth();

  return (
    <header
      className="
        sticky top-0 z-40 w-full
        bg-gradient-to-b from-[#06122e] to-[#0b1f4a]
        border-b border-white/15 shadow-lg backdrop-blur
      "
    >
      <div className="mx-auto max-w-screen-2xl h-16 md:h-20 px-6 md:px-10 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="text-white font-extrabold tracking-wide text-2xl md:text-3xl lg:text-4xl"
        >
          GERAIN CHAN
        </Link>

        <nav className="flex items-center gap-2 md:gap-6 overflow-x-auto">
          <NavLink to="/" end className={navClass}>
            <IoHomeOutline className="text-2xl md:text-3xl" />
            <span>Home</span>
          </NavLink>

          <NavLink to="/releases" className={navClass}>
            <IoRocketOutline className="text-2xl md:text-3xl" />
            <span>Releases</span>
          </NavLink>

          <NavLink to="/shop" className={navClass}>
            <IoCartOutline className="text-2xl md:text-3xl" />
            <span>Shop</span>
          </NavLink>

          <NavLink to="/account" className={navClass}>
            <IoPersonOutline className="text-2xl md:text-3xl" />
            <span>Account</span>
          </NavLink>

          {/* ✅ Admin-only link */}
          {user?.role === "admin" && (
            <NavLink to="/admin/dashboard" className={navClass}>
              <IoSettingsOutline className="text-2xl md:text-3xl" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
