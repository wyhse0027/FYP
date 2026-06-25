// src/components/TopNav.js
import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { IoCartOutline, IoPersonCircleOutline } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";

const navItem = ({ isActive }) =>
  `relative px-0.5 py-1 text-xs uppercase tracking-[0.3em] transition-colors ` +
  `after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:bg-luxury-gold after:transition-all after:duration-300 ` +
  (isActive
    ? "text-luxury-gold2 after:w-full"
    : "text-luxury-champagne hover:text-white after:w-0 hover:after:w-full");

const iconItem =
  "text-luxury-champagne hover:text-luxury-gold2 transition-colors";

export default function TopNav() {
  const { user } = useAuth();
  const location = useLocation();

  // 🚫 Hide TopNav on auth pages
  if (["/login", "/signup", "/forgot-password"].includes(location.pathname)) {
    return null;
  }

  return (
    <div className="hidden md:block sticky top-0 z-40 w-full">
      {/* Announcement */}
      <div className="bg-luxury-bg text-center text-[10px] label uppercase text-luxury-gold/80 py-2.5 border-b border-white/5">
        Complimentary engraving &amp; shipping on every order
      </div>
      {/* Nav */}
      <header className="w-full bg-luxury-bg/80 backdrop-blur-xl border-b border-luxury-gold/15">
        <div className="mx-auto max-w-screen-2xl h-20 px-10 grid grid-cols-3 items-center">
          {/* Left nav */}
          <nav className="flex items-center gap-9 justify-start">
            <NavLink to="/" end className={navItem}>Home</NavLink>
            <NavLink to="/shop" className={navItem}>Shop</NavLink>
            <NavLink to="/quiz" className={navItem}>Scent Quiz</NavLink>
          </nav>

          {/* Center brand */}
          <Link
            to="/"
            className="text-center font-serif text-2xl lg:text-[28px] font-medium tracking-[0.3em] text-white hover:text-luxury-champagne transition-colors"
          >
            GÉRAIN&nbsp;CHAN
          </Link>

          {/* Right */}
          <nav className="flex items-center gap-7 justify-end">
            <NavLink to="/releases" className={navItem}>Releases</NavLink>
            {user?.is_staff === true && (
              <NavLink to="/admin/dashboard" className={navItem}>Admin</NavLink>
            )}
            <NavLink to="/cart" className={iconItem} aria-label="Cart">
              <IoCartOutline className="text-2xl" />
            </NavLink>
            <NavLink to="/account" className={iconItem} aria-label="Account">
              <IoPersonCircleOutline className="text-2xl" />
            </NavLink>
          </nav>
        </div>
      </header>
    </div>
  );
}
