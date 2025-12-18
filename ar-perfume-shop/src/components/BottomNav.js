import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IoHomeOutline,
  IoRocketOutline,
  IoCartOutline,
  IoPersonOutline,
} from "react-icons/io5";

const BottomNav = () => {
  const { pathname } = useLocation();

  // 🚫 Hide bottom nav on auth pages
  if (["/login", "/signup", "/forgot-password"].includes(pathname)) {
    return null;
  }

  const navItems = [
    { path: "/", icon: <IoHomeOutline size={28} />, label: "Home" },
    { path: "/releases", icon: <IoRocketOutline size={28} />, label: "Releases" },
    { path: "/shop", icon: <IoCartOutline size={28} />, label: "Shop" },
    { path: "/account", icon: <IoPersonOutline size={28} />, label: "Account" },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-white border-t border-gray-300 lg:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1
                ${
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-gray-500"
                }
              `}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-base">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
