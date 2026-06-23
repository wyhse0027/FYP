import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAuthed, loading } = useAuth();
  const location = useLocation();

  // 🔄 Show loader while profile is being fetched
  if (loading) return <div className="text-white p-6">Loading…</div>;

  // 🚪 Redirect unauthenticated users to login
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🔒 Only admin accounts allowed
  if (adminOnly && user?.is_staff !== true) {
    return <Navigate to="/" replace />;
  }

  return children;
}
