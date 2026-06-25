// src/pages/SignupPage.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

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
      const accessToken = credentialResponse.access_token || credentialResponse.credential;
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
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-5">Join the maison</p>
          <h1 className="font-serif text-6xl text-white leading-tight mb-5">
            Begin your
            <br />
            journey.
          </h1>
          <p className="font-cormorant italic text-2xl text-luxury-champagne/75 max-w-sm">
            Personalized discovery, member releases and a smoother checkout — yours.
          </p>
        </div>
        <p className="relative text-[10px] label uppercase text-luxury-mut">
          Immersive Perfume · AR Experience
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="glass rounded-3xl p-8 sm:p-9 w-full max-w-md">
          <Link
            to="/"
            className="lg:hidden block text-center font-serif text-xl tracking-[0.3em] text-white mb-6"
          >
            GÉRAIN&nbsp;CHAN
          </Link>

          <h2 className="font-serif text-3xl text-white mb-1">Create Account</h2>
          <p className="text-sm text-luxury-mut mb-7">Enter your details to get started.</p>

          <form onSubmit={onSubmit}>
            {err && (
              <div className="rounded-xl bg-red-500/15 border border-red-400/25 px-4 py-3 text-sm text-red-200 mb-5">
                {err}
              </div>
            )}

            <label className="block text-[11px] label uppercase text-luxury-mut mb-2">Email Address</label>
            <input
              type="email"
              className="fld w-full px-4 py-3.5 rounded-xl text-white outline-none mb-5"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <label className="block text-[11px] label uppercase text-luxury-mut mb-2">Username</label>
            <input
              type="text"
              className="fld w-full px-4 py-3.5 rounded-xl text-white outline-none mb-5"
              placeholder="Your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[11px] label uppercase text-luxury-mut mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="fld w-full px-4 py-3.5 pr-11 rounded-xl text-white outline-none"
                    placeholder="••••••••"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-luxury-mut hover:text-white transition"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] label uppercase text-luxury-mut mb-2">Confirm</label>
                <div className="relative">
                  <input
                    type={showPw2 ? "text" : "password"}
                    className="fld w-full px-4 py-3.5 pr-11 rounded-xl text-white outline-none"
                    placeholder="••••••••"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-luxury-mut hover:text-white transition"
                    aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showPw2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-lux w-full py-4 rounded-full text-[12px] font-medium label uppercase mb-5 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create Account"}
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
                  onError={() => setErr("Google sign-up failed")}
                  useOneTap
                />
              </div>
            </div>

            <p className="text-center text-sm text-luxury-mut mt-7">
              Already have an account?{" "}
              <Link to="/login" className="text-luxury-gold2 hover:text-white transition">
                Sign in
              </Link>
            </p>
          </form>

          <p className="text-center text-xs text-luxury-mut mt-6">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="text-luxury-gold2 hover:text-white transition">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-luxury-gold2 hover:text-white transition">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
