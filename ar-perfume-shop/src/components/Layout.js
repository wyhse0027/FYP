import React from 'react';
// 1. Import Outlet from react-router-dom
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

const Layout = () => {
  return (
    <div className="relative min-h-screen bg-gray-100">
      <TopNav />
      
      <main className="pb-20"> 
        {/* 2. Replace {children} with <Outlet /> */}
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Layout;