// src/pages/LoginPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Sparkles, Lock, Mail, Eye, EyeOff, ArrowRight, Crown } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { mergeCartToBackend } = useCart();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setErr("");
      setBusy(true);

      const accessToken =
        credentialResponse.access_token || credentialResponse.credential;

      if (!accessToken) {
        setErr("Google token missing.");
        return;
      }

      await loginWithGoogle(accessToken);
      await mergeCartToBackend();
      navigate("/", { replace: true });
    } catch {
      setErr("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] relative overflow-hidden">
      {/* Decorative background (blue/white + tiny gold accents) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[520px] h-[520px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[420px] h-[420px] bg-[rgba(212,175,55,0.08)] rounded-full blur-3xl" />

        {/* Floating sparkles */}
        {[...Array(8)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-[rgba(212,175,55,0.22)]"
            size={14 + (i % 3) * 6}
            style={{
              top: `${10 + (i * 11) % 80}%`,
              left: `${5 + (i * 17) % 90}%`,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Decorative lines */}
        <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-[rgba(212,175,55,0.08)] to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
          <div className="relative z-10 text-center max-w-lg">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 border border-white/10 backdrop-blur mb-8">
              <Crown className="w-12 h-12 text-[rgba(212,175,55,0.95)]" />
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white mb-6">
              <span className="text-[rgba(212,175,55,0.95)]">Welcome</span>
              <br />
              <span className="text-white/90">Back</span>
            </h1>

            <p className="text-xl text-white/70 italic mb-8 leading-relaxed">
              Enter your sanctuary of luxury fragrances.
              <br />
              Your curated collection awaits.
            </p>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.5)]" />
              <Sparkles className="w-5 h-5 text-[rgba(212,175,55,0.65)]" />
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.5)]" />
            </div>

            {/* Features */}
            <div className="space-y-4 text-left">
              {[
                "Access your wishlist & saved fragrances",
                "Track orders & exclusive releases",
                "Personalized recommendations",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgba(212,175,55,0.65)]" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* subtle dot pattern */}
          <div className="absolute inset-0 opacity-[0.06]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, rgba(212,175,55,0.9) 1px, transparent 0)",
                backgroundSize: "42px 42px",
              }}
            />
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 border border-white/10 backdrop-blur mb-4">
                <Crown className="w-8 h-8 text-[rgba(212,175,55,0.95)]" />
              </div>
              <h1 className="text-3xl font-extrabold">
                <span className="text-[rgba(212,175,55,0.95)]">Welcome Back</span>
              </h1>
            </div>

            {/* Form Card */}
            <div className="rounded-3xl p-8 md:p-10 bg-white/10 border border-white/10 backdrop-blur-sm shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                  Sign In
                </h2>
                <p className="text-white/70 text-sm">
                  Enter your credentials to continue
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                {err && (
                  <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 text-sm text-red-200">
                    {err}
                  </div>
                )}

                {/* Email/Username */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/80">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                    <input
                      type="text"
                      className="w-full h-14 rounded-xl pl-12 pr-4 bg-white/10 border border-white/10 text-white
                                 placeholder:text-white/45 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="you@example.com"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/80">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full h-14 rounded-xl pl-12 pr-12 bg-white/10 border border-white/10 text-white
                                 placeholder:text-white/45 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[rgba(212,175,55,0.95)] hover:text-white transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-14 rounded-xl font-extrabold text-base md:text-lg
                             bg-white text-[#0c1a3a]
                             hover:bg-white/90 transition
                             disabled:opacity-60 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#0c1a3a]/30 border-t-[#0c1a3a] rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-xs text-white/60 uppercase tracking-wider">
                    or continue with
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Google */}
                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setErr("Google sign-in failed")}
                      useOneTap
                    />
                  </div>
                </div>

                {/* Sign up link */}
                <div className="pt-4 text-center text-sm text-white/75">
                  <span className="mr-1">Don’t have an account?</span>
                  <Link
                    to="/signup"
                    className="text-[rgba(212,175,55,0.95)] hover:text-white
                              font-semibold hover:underline underline-offset-4 transition"
                  >
                    Create account
                  </Link>
                </div>
              </form>
            </div>

            {/* Bottom decoration */}
            <div className="flex items-center justify-center gap-2 mt-8 text-white">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs">Secure & Encrypted</span>
              <Sparkles className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
