import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IoHome,
  IoHomeOutline,
  IoSparkles,
  IoSparklesOutline,
  IoBagHandle,
  IoBagHandleOutline,
  IoPerson,
  IoPersonOutline,
} from "react-icons/io5";

const BottomNav = () => {
  const { pathname } = useLocation();

  // 🚫 Hide bottom nav on auth pages
  if (["/login", "/signup", "/forgot-password"].includes(pathname)) {
    return null;
  }

  const navItems = [
    { path: "/", label: "Home", On: IoHome, Off: IoHomeOutline },
    { path: "/releases", label: "Releases", On: IoSparkles, Off: IoSparklesOutline },
    { path: "/shop", label: "Shop", On: IoBagHandle, Off: IoBagHandleOutline },
    { path: "/account", label: "Account", On: IoPerson, Off: IoPersonOutline },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
      <div
        className="bg-luxury-bg/90 backdrop-blur-xl border-t border-luxury-gold/15 pb-[env(safe-area-inset-bottom)]"
        style={{ boxShadow: "0 -18px 40px -24px rgba(212,175,55,0.35)" }}
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {navItems.map(({ path, label, On, Off }) => {
            const isActive =
              path === "/" ? pathname === "/" : pathname.startsWith(path);
            const Icon = isActive ? On : Off;
            return (
              <Link
                key={path}
                to={path}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5"
                aria-label={label}
              >
                {isActive && (
                  <span className="absolute top-0 h-px w-9 rounded-full bg-luxury-gold" />
                )}
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-luxury-gold/12 text-luxury-gold2"
                      : "text-luxury-champagne/70"
                  }`}
                >
                  <Icon size={22} />
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.18em] ${
                    isActive ? "text-luxury-gold2" : "text-luxury-champagne/60"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
