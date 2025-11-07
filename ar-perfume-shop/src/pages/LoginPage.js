import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { mergeCartToBackend } = useCart();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ─── Normal Login ───
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      setBusy(true);
      const user = await login({ usernameOrEmail, password });
      await mergeCartToBackend();

      if (user?.role === "admin") navigate("/admin/dashboard", { replace: true });
      else navigate("/", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  // ─── Google Login ───
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const accessToken =
        credentialResponse.access_token || credentialResponse.credential;

      if (!accessToken) {
        setErr("Google token missing.");
        return;
      }

      const user = await loginWithGoogle(accessToken);
      await mergeCartToBackend();
      navigate("/", { replace: true });
    } catch (err) {
      setErr("Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-xl py-8 text-white">
        <PageHeader title="Sign in" />
        <div className="mx-auto w-full max-w-2xl">
          <form
            onSubmit={onSubmit}
            className="bg-white/10 rounded-2xl p-8 md:p-10 shadow-xl backdrop-blur"
          >
            <div className="space-y-6">
              {err && (
                <div className="rounded-lg bg-red-600/80 px-4 py-3 text-sm">
                  {err}
                </div>
              )}

              <div>
                <label className="block mb-2 text-lg font-semibold">
                  Username or Email
                </label>
                <input
                  type="text"
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="you@example.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-2 text-lg font-semibold">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-14 rounded-xl bg-sky-600 hover:bg-sky-500 transition font-bold text-lg disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>

              {/* Divider */}
              <div className="flex items-center justify-center my-4">
                <div className="flex-grow border-t border-white/20"></div>
                <span className="mx-4 text-sm text-white/70">
                  or continue with
                </span>
                <div className="flex-grow border-t border-white/20"></div>
              </div>

              {/* Google Login */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErr("Google sign-in failed")}
                  useOneTap
                />
              </div>

              <div className="flex items-center justify-between text-sm text-white/80 mt-6">
                <Link to="/forgot-password" className="hover:underline">
                  Forgot password?
                </Link>
                <Link to="/signup" className="hover:underline">
                  Create account
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
