import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import http from "../lib/http";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [refresh, setRefresh] = useState(localStorage.getItem("refresh") || "");

  // 🔄 Fetch current user profile
  const fetchProfile = async () => {
    if (!access) {
      setUser(null);
      return;
    }
    try {
      const res = await http.get("me/");
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch {
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  // 🔄 Initial load if token exists
  useEffect(() => {
    if (!user && localStorage.getItem("access")) {
      fetchProfile();
    }
  }, []);

  // 🔄 Refetch when access changes
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  // 🔄 Global 401 logout listener
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  // ---- Login (username/email + password) ----
  const login = async ({ usernameOrEmail, password }) => {
    try {
      const res = await http.post("token/", {
        username: usernameOrEmail,
        password,
      });

      const { access, refresh, user } = res.data;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("user", JSON.stringify(user));

      setAccess(access);
      setRefresh(refresh);
      setUser(user);

      return user;
    } catch {
      throw new Error("Invalid credentials");
    }
  };

  // ---- Google Login ----
  const loginWithGoogle = async (googleAccessToken) => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/google/", {
        access_token: googleAccessToken,
      });

      const { access, refresh, user } = res.data;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("user", JSON.stringify(user));

      setAccess(access);
      setRefresh(refresh);
      setUser(user);

      return user;
    } catch (err) {
      console.error("Google login error:", err.response?.data || err);
      throw new Error("Google sign-in failed.");
    }
  };

  // ---- Signup ----
  const signup = async ({ email, username, password }) => {
    try {
      await http.post("signup/", { email, username, password });
      return login({ usernameOrEmail: username, password }); // auto-login
    } catch {
      throw new Error("Signup failed");
    }
  };

  // ---- Logout ----
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    setAccess("");
    setRefresh("");
    setUser(null);
  };

  // ---- Password Reset ----
  const sendPasswordReset = async (email) => {
    try {
      await http.post("password-reset/", { email });
      return true;
    } catch {
      throw new Error("Failed to send reset email");
    }
  };

  const confirmPasswordReset = async ({ uid, token, newPassword }) => {
    try {
      await http.post("password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      });
      return true;
    } catch {
      throw new Error("Failed to reset password");
    }
  };

  // ✅ Exported context value
  const value = useMemo(
    () => ({
      user,
      isAuthed: !!access,
      login,
      loginWithGoogle,
      signup,
      logout,
      sendPasswordReset,
      confirmPasswordReset,
      access,
      refresh,
      fetchProfile,
    }),
    [user, access, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
