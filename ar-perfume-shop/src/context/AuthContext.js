// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import http from "../lib/http";

const AuthContext = createContext(null);

const LS = {
  ACCESS: "access",
  REFRESH: "refresh",
  USER: "user",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(LS.USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [access, setAccess] = useState(() => localStorage.getItem(LS.ACCESS) || "");
  const [refresh, setRefresh] = useState(() => localStorage.getItem(LS.REFRESH) || "");

  const [loadingUser, setLoadingUser] = useState(false);

  // prevent duplicate profile calls
  const fetchingRef = useRef(false);

  const persistAuth = ({ access, refresh, user }) => {
    if (access) localStorage.setItem(LS.ACCESS, access);
    if (refresh) localStorage.setItem(LS.REFRESH, refresh);
    if (user) localStorage.setItem(LS.USER, JSON.stringify(user));

    setAccess(access || "");
    setRefresh(refresh || "");
    setUser(user || null);
  };

  const clearAuth = () => {
    localStorage.removeItem(LS.ACCESS);
    localStorage.removeItem(LS.REFRESH);
    localStorage.removeItem(LS.USER);

    setAccess("");
    setRefresh("");
    setUser(null);
  };

  // ---- OPTIONAL: refresh access token if expired (SimpleJWT default endpoint: token/refresh/) ----
  const refreshAccessToken = async () => {
    const r = localStorage.getItem(LS.REFRESH);
    if (!r) throw new Error("No refresh token");

    const res = await http.post("token/refresh/", { refresh: r });
    const newAccess = res.data?.access;
    if (!newAccess) throw new Error("Refresh failed (no access returned)");

    localStorage.setItem(LS.ACCESS, newAccess);
    setAccess(newAccess);
    return newAccess;
  };

  // 🔄 Fetch current user profile (safe + retry once)
  const fetchProfile = async () => {
    const token = localStorage.getItem(LS.ACCESS);
    if (!token) {
      setUser(null);
      localStorage.removeItem(LS.USER);
      return;
    }

    // guard: avoid duplicate calls
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoadingUser(true);

    try {
      const res = await http.get("me/");
      setUser(res.data);
      localStorage.setItem(LS.USER, JSON.stringify(res.data));
    } catch (err) {
      // If access expired, try refresh once, then retry me/
      const status = err?.response?.status;

      if (status === 401 && localStorage.getItem(LS.REFRESH)) {
        try {
          await refreshAccessToken();
          const res2 = await http.get("me/");
          setUser(res2.data);
          localStorage.setItem(LS.USER, JSON.stringify(res2.data));
        } catch (e2) {
          clearAuth();
        }
      } else {
        // any other error: keep it strict
        clearAuth();
      }
    } finally {
      fetchingRef.current = false;
      setLoadingUser(false);
    }
  };

  // 🔄 Initial load if token exists (only once)
  useEffect(() => {
    if (localStorage.getItem(LS.ACCESS) && !user) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔄 When access changes (login / refresh), refetch profile if needed
  useEffect(() => {
    if (access && !user) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  // 🔄 Global 401 logout listener (kept from your design)
  useEffect(() => {
    const handleUnauthorized = () => clearAuth();
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
      persistAuth({ access, refresh, user });

      // If backend doesn't return `user`, fetch it
      await fetchProfile();

      return user || JSON.parse(localStorage.getItem(LS.USER) || "null");
    } catch {
      throw new Error("Invalid credentials");
    }
  };

  // ---- Google Login ----
  const loginWithGoogle = async (idToken) => {
    try {
      const res = await http.post("auth/google/", {
        id_token: idToken,
      });

      const { access, refresh, user } = res.data;
      persistAuth({ access, refresh, user });

      if (!user) await fetchProfile();
      return user || JSON.parse(localStorage.getItem(LS.USER) || "null");
    } catch (err) {
      console.error("Google login error:", err.response?.data || err);
      throw new Error("Google sign-in failed.");
    }
  };

  // ---- Signup ----
  const signup = async ({ email, username, password }) => {
    try {
      await http.post("signup/", { email, username, password });
      return login({ usernameOrEmail: username, password });
    } catch {
      throw new Error("Signup failed");
    }
  };

  // ---- Logout ----
  const logout = () => {
    clearAuth();
  };

  // ---- Password Reset (SendGrid custom endpoints) ----
  const sendPasswordReset = async (email) => {
    try {
      // ✅ NEW endpoint
      await http.post("auth/password-reset/", { email });
      return true;
    } catch (err) {
      console.error(err?.response?.data || err);
      throw new Error("Failed to send reset email");
    }
  };

  const confirmPasswordReset = async ({ uid, token, newPassword }) => {
    try {
      // ✅ NEW endpoint
      await http.post("auth/password-reset-confirm/", {
        uid,
        token,
        new_password: newPassword,
      });
      return true;
    } catch (err) {
      console.error(err?.response?.data || err);
      throw new Error("Failed to reset password");
    }
  };


  const value = useMemo(
    () => ({
      user,
      isAuthed: !!access,
      loadingUser, // useful for UI skeletons
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
    [user, access, refresh, loadingUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
