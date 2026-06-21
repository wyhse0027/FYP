// src/pages/ResetPasswordConfirmPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Eye, EyeOff, ArrowLeft, Sparkles, Crown } from "lucide-react";

export default function ResetPasswordConfirmPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw1 !== pw2) return setErr("Passwords do not match");

    try {
      setBusy(true);
      await confirmPasswordReset({ uid, token, newPassword: pw1 });
      setDone(true);
    } catch (e2) {
      setErr(e2?.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  // redirect after success
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/login"), 2000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  return (
    <div className="min-h-screen w-full flex bg-[#0c1a3a] relative overflow-hidden">
      {/* background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[520px] h-[520px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[420px] h-[420px] bg-[rgba(212,175,55,0.08)] rounded-full blur-3xl" />
        <div className="absolute top-24 left-10 w-40 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-28 right-16 w-56 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.18)] to-transparent" />
      </div>

      {/* Left Panel desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 border border-white/10 backdrop-blur mb-8">
            <Crown className="w-12 h-12 text-[rgba(212,175,55,0.95)]" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white">
            Set a new{" "}
            <span className="block mt-2 text-[rgba(212,175,55,0.95)]">
              password
            </span>
          </h1>

          <p className="mt-4 text-white text-lg max-w-md leading-relaxed">
            Choose a strong password. You’ll be redirected to login after a
            successful reset.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.5)]" />
            <Sparkles className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.5)]" />
          </div>
        </div>

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
        {/* Back to login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-[rgba(212,175,55,0.95)] transition-colors mb-8 group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to login</span>
        </Link>

        <div className="max-w-md mx-auto lg:mx-0 w-full">
          <h2 className="text-3xl font-extrabold text-white mb-2">
            Set a new password
          </h2>
          <p className="text-white/60 mb-8">
            Enter and confirm your new password.
          </p>

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

              {done && (
                <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-200 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Password reset successful! Redirecting to login…
                </div>
              )}

              <div className="space-y-6">
                {/* New password */}
                <div>
                  <label className="block text-white/75 text-sm font-semibold mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
                    <input
                      type={show1 ? "text" : "password"}
                      className="w-full h-14 pl-12 pr-12 rounded-xl bg-white/10 border border-white/10 text-white
                                 placeholder-white/35 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="Enter new password"
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow1((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                      aria-label={show1 ? "Hide password" : "Show password"}
                    >
                      {show1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-white/75 text-sm font-semibold mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
                    <input
                      type={show2 ? "text" : "password"}
                      className="w-full h-14 pl-12 pr-12 rounded-xl bg-white/10 border border-white/10 text-white
                                 placeholder-white/35 focus:outline-none focus:border-white/25
                                 focus:ring-4 focus:ring-white/10 transition"
                      placeholder="Repeat new password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow2((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white transition"
                      aria-label={show2 ? "Hide confirm password" : "Show confirm password"}
                    >
                      {show2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || done}
                  className="relative w-full h-14 rounded-xl font-extrabold text-[#0c1a3a] overflow-hidden group
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white group-hover:bg-white/90 transition-all duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0c1a3a]/30 border-t-[#0c1a3a] rounded-full animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <span>Save new password</span>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>

          <p className="mt-6 text-center text-white text-xs">
            Tip: use at least 8 characters with numbers + symbols.
          </p>
        </div>
      </div>
    </div>
  );
}
