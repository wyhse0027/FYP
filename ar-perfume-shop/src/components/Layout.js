import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#050b1f]">
      {/* Top navigation */}
      <TopNav />

      {/* Page content */}
      <main className="flex-grow pb-20">
        <Outlet />
      </main>

      {/* Global footer */}
      <Footer />

      {/* Bottom mobile nav (fixed) */}
      <BottomNav />
    </div>
  );
};

export default Layout;
