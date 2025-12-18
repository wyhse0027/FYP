// src/pages/ForgotPasswordPage.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, ArrowLeft, Sparkles, Send, Crown } from "lucide-react";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email.trim()) {
      setErr("Email is required");
      return;
    }

    try {
      setBusy(true);
      await sendPasswordReset(email);
      setMsg("If the email exists, a reset link has been sent.");
    } catch (e2) {
      setErr(e2?.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0c1a3a] relative overflow-hidden">
      {/* shared background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[520px] h-[520px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[420px] h-[420px] bg-[rgba(212,175,55,0.08)] rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-40 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-28 right-16 w-56 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.18)] to-transparent" />
      </div>

      {/* Left Panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center">
          <div className="mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center">
                <Send className="w-10 h-10 text-[rgba(212,175,55,0.95)]" />
              </div>
              <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow">
                <Sparkles className="w-4 h-4 text-[#0c1a3a]" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white">
            Reset Your{" "}
            <span className="block mt-2 text-[rgba(212,175,55,0.95)]">
              Password
            </span>
          </h1>

          <p className="mt-4 text-white text-lg max-w-md leading-relaxed">
            Enter your email and we’ll send a secure reset link.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.5)]" />
            <Sparkles className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.5)]" />
          </div>

          <div className="mt-10 flex items-center gap-8 text-white text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Secure Reset</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[rgba(212,175,55,0.8)]" />
              <span>Quick Process</span>
            </div>
          </div>
        </div>

        {/* subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(212,175,55,0.9) 1px, transparent 0)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 relative z-10 min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12">
        {/* mobile branding */}
        <div className="lg:hidden text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 border border-white/10 backdrop-blur mb-4">
            <Crown className="w-8 h-8 text-[rgba(212,175,55,0.95)]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Forgot{" "}
            <span className="text-[rgba(212,175,55,0.95)]">Password</span>
          </h1>
        </div>

        {/* Back to login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-[rgba(212,175,55,0.95)] transition-colors mb-8 group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to login</span>
        </Link>

        <div className="max-w-md mx-auto lg:mx-0 w-full">
          <h2 className="hidden lg:block text-3xl font-extrabold text-white mb-2">
            Forgot password?
          </h2>
          <p className="hidden lg:block text-white/60 mb-8">
            Enter your email address to receive a reset link.
          </p>

          {/* glow wrapper */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[rgba(212,175,55,0.18)] via-transparent to-[rgba(212,175,55,0.18)] rounded-3xl blur-xl opacity-70" />

            <form
              onSubmit={onSubmit}
              className="relative bg-white/[0.08] backdrop-blur-xl rounded-2xl p-8 border border-white/10"
            >
              {err && (
                <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-200 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {err}
                </div>
              )}

              {msg && (
                <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-200 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {msg}
                </div>
              )}

              <div className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-white/75 text-sm font-semibold mb-2">
                    Email Address
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-white/35 group-focus-within:text-[rgba(212,175,55,0.95)] transition-colors" />
                    </div>

                    <input
                      type="email"
                      className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/10 border border-white/10 text-white
                                 placeholder-white/35 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <p className="mt-2 text-white/45 text-xs">
                    We’ll send a secure reset link to this email.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="relative w-full h-14 rounded-xl font-extrabold text-[#0c1a3a] overflow-hidden group
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white group-hover:bg-white/90 transition-all duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0c1a3a]/30 border-t-[#0c1a3a] rounded-full animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <Sparkles className="w-3 h-3 text-[rgba(212,175,55,0.35)]" />
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </div>

              {/* Extra links */}
              <div className="text-center space-y-3">
                <p className="text-white/50 text-sm">
                  Remember your password?{" "}
                  <Link
                    to="/login"
                    className="text-[rgba(212,175,55,0.95)] hover:text-white transition-colors font-semibold"
                  >
                    Sign in
                  </Link>
                </p>

                <p className="text-white/50 text-sm">
                  Don’t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-[rgba(212,175,55,0.95)] hover:text-white transition-colors font-semibold"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-white text-xs">
            If you don’t receive an email within 5 minutes, check your spam
            folder.
          </p>
        </div>
      </div>
    </div>
  );
}
