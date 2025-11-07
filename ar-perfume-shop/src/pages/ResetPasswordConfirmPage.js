// src/pages/ResetPasswordConfirmPage.js
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordConfirmPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw1 !== pw2) return setErr("Passwords do not match");
    try {
      setBusy(true);
      await confirmPasswordReset({ uid, token, newPassword: pw1 });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (e2) {
      setErr(e2?.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-xl py-8 text-white">
        <PageHeader title="Set a new password" />
        <div className="mx-auto w-full max-w-xl">
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
              {done && (
                <div className="rounded-lg bg-emerald-600/80 px-4 py-3 text-sm">
                  Password reset successful! Redirecting to login…
                </div>
              )}

              <div>
                <label className="block mb-2 text-lg font-semibold">New password</label>
                <input
                  type="password"
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="Enter new password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 text-lg font-semibold">Confirm password</label>
                <input
                  type="password"
                  className="w-full h-14 rounded-xl px-4 text-blue-900 bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/40"
                  placeholder="Repeat new password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-14 rounded-xl bg-sky-600 hover:bg-sky-500 transition font-bold text-lg disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
