import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
      const accessToken =
        credentialResponse.access_token || credentialResponse.credential;
      if (!accessToken) {
        setErr("Google token missing.");
        return;
      }

      await loginWithGoogle(accessToken);
      navigate("/", { replace: true });
    } catch (err) {
      setErr("Google sign-up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-xl py-8 text-white">
        <PageHeader title="Create account" />
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
                <label className="block mb-2 text-lg font-semibold">Email</label>
                <input
                  type="email"
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-2 text-lg font-semibold">Username</label>
                <input
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="Your display name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-lg font-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                    placeholder="Create a password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-lg font-semibold">
                    Confirm
                  </label>
                  <input
                    type="password"
                    className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                    placeholder="Repeat password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-14 rounded-xl bg-sky-600 hover:bg-sky-500 transition font-bold text-lg disabled:opacity-60"
              >
                {busy ? "Creating…" : "Sign up"}
              </button>

              {/* Divider + Google login */}
              <div className="flex items-center justify-center my-4">
                <div className="flex-grow border-t border-white/20"></div>
                <span className="mx-4 text-sm text-white/70">
                  or continue with
                </span>
                <div className="flex-grow border-t border-white/20"></div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErr("Google sign-up failed")}
                  useOneTap
                />
              </div>

              <div className="text-center text-sm text-white/80">
                Already have an account?{" "}
                <Link to="/login" className="hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
