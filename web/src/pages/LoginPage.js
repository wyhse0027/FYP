// src/pages/LoginPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { mergeCartToBackend } = useCart();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      setBusy(true);
      const user = await login({ usernameOrEmail, password });
      await mergeCartToBackend();
      if (user?.is_staff === true) navigate("/admin/dashboard", { replace: true });
      else navigate("/", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setErr("");
      setBusy(true);
      const idToken = credentialResponse.credential;
      if (!idToken) {
        setErr("Google token missing.");
        return;
      }
      await loginWithGoogle(idToken);
      await mergeCartToBackend();
      navigate("/", { replace: true });
    } catch {
      setErr("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-luxury-bg text-luxury-text">
      {/* Left: brand */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden"
        style={{ background: "radial-gradient(80% 60% at 30% 20%,#16213f,#0a1124 60%,#070B14)" }}
      >
        <div
          className="absolute w-[30rem] h-[30rem] rounded-full -left-32 top-1/4"
          style={{ background: "radial-gradient(circle,rgba(212,175,55,0.16),transparent 62%)" }}
        />
        <Link to="/" className="relative font-serif text-2xl tracking-[0.3em] text-white">
          GÉRAIN&nbsp;CHAN
        </Link>
        <div className="relative">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-5">Welcome back</p>
          <h1 className="font-serif text-6xl text-white leading-tight mb-5">
            Enter your
            <br />
            atelier.
          </h1>
          <p className="font-cormorant italic text-2xl text-luxury-champagne/75 max-w-sm">
            Your fragrances, orders and AR experiences — all in one place.
          </p>
        </div>
        <p className="relative text-[10px] label uppercase text-luxury-mut">
          Immersive Perfume · AR Experience
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="glass rounded-3xl p-8 sm:p-9 w-full max-w-md">
          {/* Mobile brand */}
          <Link
            to="/"
            className="lg:hidden block text-center font-serif text-xl tracking-[0.3em] text-white mb-6"
          >
            GÉRAIN&nbsp;CHAN
          </Link>

          <h2 className="font-serif text-3xl text-white mb-1">Sign In</h2>
          <p className="text-sm text-luxury-mut mb-7">Enter your credentials to continue.</p>

          <form onSubmit={onSubmit}>
            {err && (
              <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 text-sm text-red-200 mb-5">
                {err}
              </div>
            )}

            <label className="block text-[11px] label uppercase text-luxury-mut mb-2">
              Email or Username
            </label>
            <input
              type="text"
              className="fld w-full px-4 py-3.5 rounded-xl text-white outline-none mb-5"
              placeholder="you@example.com"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoFocus
              required
            />

            <label className="block text-[11px] label uppercase text-luxury-mut mb-2">
              Password
            </label>
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                className="fld w-full px-4 py-3.5 pr-12 rounded-xl text-white outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-luxury-mut hover:text-white transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="text-right mb-6">
              <Link
                to="/forgot-password"
                className="text-[11px] label uppercase text-luxury-gold2 hover:text-white transition"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-lux w-full py-4 rounded-full text-[12px] font-medium label uppercase mb-5 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>

            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 rule" />
              <span className="text-[10px] label uppercase text-luxury-mut">or</span>
              <div className="flex-1 rule" />
            </div>

            <div className="flex justify-center">
              <div className="rounded-xl overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErr("Google sign-in failed")}
                  useOneTap
                />
              </div>
            </div>

            <p className="text-center text-sm text-luxury-mut mt-7">
              No account?{" "}
              <Link to="/signup" className="text-luxury-gold2 hover:text-white transition">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
