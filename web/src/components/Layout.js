import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

const Layout = () => {
  const location = useLocation();

  // 🔥 detect AR routes
  const isARPage =
    location.pathname.startsWith("/ar") ||
    location.pathname.startsWith("/arview");

  // 🔒 lock scrolling in AR mode
  useEffect(() => {
    if (isARPage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isARPage]);

  return (
    <div
      className={`relative min-h-screen flex flex-col ${
        isARPage ? "bg-black" : "bg-[#050b1f]"
      }`}
    >
      {/* ❌ Top navigation hidden in AR */}
      {!isARPage && <TopNav />}

      {/* Page content */}
      <main
        className={`flex-grow ${isARPage ? "" : "pb-20 md:pb-0"}`}
        style={
          isARPage
            ? {
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
              }
            : {}
        }
      >
        <Outlet />
      </main>

      {/* ❌ Footer hidden in AR */}
      {!isARPage && <Footer />}

      {/* ❌ Bottom nav hidden in AR + desktop */}
      {!isARPage && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
};

export default Layout;
