import React from 'react';
// 1. Import Link and useLocation
import { Link, useLocation } from 'react-router-dom';
import { IoHomeOutline, IoRocketOutline, IoCartOutline, IoPersonOutline } from 'react-icons/io5';

const BottomNav = () => {
  // 2. Get the current URL path
  const { pathname } = useLocation();

  const navItems = [
    { path: '/', icon: <IoHomeOutline />, label: 'Home' },
    { path: '/releases', icon: <IoRocketOutline />, label: 'Releases' },
    { path: '/shop', icon: <IoCartOutline />, label: 'Shop' },
    { path: '/account', icon: <IoPersonOutline />, label: 'Account' },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 lg:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map(item => (
          // 3. Change <button> to <Link> and add conditional styling
          <Link
            key={item.path}
            to={item.path}
            className={`inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 ${
              pathname === item.path ? 'text-blue-600' : 'text-gray-500' // <-- This is the magic!
            }`}
          >
            <div className="w-6 h-6 mb-1">{item.icon}</div>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;