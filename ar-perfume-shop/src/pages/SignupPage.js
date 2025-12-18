// src/pages/SignupPage.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import {
  Crown,
  Sparkles,
  Star,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw !== pw2) return setErr("Passwords do not match");

    try {
      setBusy(true);
      await signup({ email, username, password: pw });
      navigate("/account");
    } catch (e2) {
      setErr(e2?.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

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
      navigate("/", { replace: true });
    } catch {
      setErr("Google sign-up failed. Please try again.");
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
        {[...Array(10)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-[rgba(212,175,55,0.25)]"
            size={14 + (i % 3) * 6}
            style={{
              top: `${10 + (i * 9) % 80}%`,
              left: `${5 + (i * 13) % 90}%`,
              opacity: 0.6,
            }}
          />
        ))}

        {/* lines */}
        <div className="absolute top-24 left-10 w-40 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-28 right-16 w-56 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.18)] to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
          <div className="max-w-md text-center">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-[rgba(212,175,55,0.18)] blur-2xl rounded-full scale-150" />
              <div className="relative w-24 h-24 rounded-full bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center">
                <Crown className="w-12 h-12 text-[rgba(212,175,55,0.95)]" />
              </div>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white mb-6">
              Join the{" "}
              <span className="text-[rgba(212,175,55,0.95)]">Elite</span>
            </h1>

            <p className="text-lg text-white/70 mb-10 leading-relaxed">
              Create your account to unlock personalized fragrance discovery,
              exclusive offers, and a smoother checkout experience.
            </p>

            <div className="space-y-4 text-left">
              {[
                "Exclusive access to limited editions",
                "Personalized fragrance recommendations",
                "Member-only discounts & rewards",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-[rgba(212,175,55,0.95)]" />
                  </div>
                  <span className="text-white font-signature text-[17px] tracking-wide">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* corner deco */}
          <div className="absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-[rgba(212,175,55,0.25)] rounded-tl-3xl" />
          <div className="absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-[rgba(212,175,55,0.25)] rounded-br-3xl" />
        </div>

        {/* Right Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            {/* Mobile title */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-[rgba(212,175,55,0.95)]" />
                </div>
                <span className="text-2xl font-extrabold text-white">
                  Create Account
                </span>
              </div>
            </div>

            {/* Form Card */}
            <div className="rounded-3xl p-8 md:p-10 bg-white/10 border border-white/10 backdrop-blur-sm shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-white mb-2">
                  Create your{" "}
                  <span className="text-[rgba(212,175,55,0.95)]">account</span>
                </h2>
                <p className="text-white/70">Enter your details to get started</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                {err && (
                  <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 text-sm text-red-200">
                    {err}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/80">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                    <input
                      type="email"
                      className="w-full h-14 rounded-xl pl-12 pr-4 bg-white/10 border border-white/10 text-white
                                 placeholder:text-white/45 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/80">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                    <input
                      type="text"
                      className="w-full h-14 rounded-xl pl-12 pr-4 bg-white/10 border border-white/10 text-white
                                 placeholder:text-white/45 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="Your display name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/80">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                      <input
                        type={showPw ? "text" : "password"}
                        className="w-full h-14 rounded-xl pl-12 pr-12 bg-white/10 border border-white/10 text-white
                                   placeholder:text-white/45 focus:outline-none focus:border-white/25
                                   focus:ring-4 focus:ring-white/10 transition"
                        placeholder="••••••••"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white/80">
                      Confirm
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/55" />
                      <input
                        type={showPw2 ? "text" : "password"}
                        className="w-full h-14 rounded-xl pl-12 pr-12 bg-white/10 border border-white/10 text-white
                                   placeholder:text-white/45 focus:outline-none focus:border-white/25
                                   focus:ring-4 focus:ring-white/10 transition"
                        placeholder="••••••••"
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw2((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                        aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showPw2 ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
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
                      Creating…
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-sm text-white/60">or continue with</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Google */}
                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setErr("Google sign-up failed")}
                      useOneTap
                    />
                  </div>
                </div>

                {/* Sign in */}
                <p className="text-center text-sm text-white/75 mt-6">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-[rgba(212,175,55,0.95)] hover:underline underline-offset-4 font-semibold"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-white/70 mt-6">
              By creating an account, you agree to our{" "}
              <Link
                to="/terms"
                className="text-[rgba(212,175,55,0.95)] hover:text-white underline underline-offset-4 transition-colors"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="text-[rgba(212,175,55,0.95)] hover:text-white underline underline-offset-4 transition-colors"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
