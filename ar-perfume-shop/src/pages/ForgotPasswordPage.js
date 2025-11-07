// src/pages/ForgotPasswordPage.js
import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await sendPasswordReset(email);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-screen-xl py-8 text-white">
        <PageHeader title="Reset password" />
        <div className="mx-auto w-full max-w-xl">
          <form
            onSubmit={onSubmit}
            className="bg-white/10 rounded-2xl p-8 md:p-10 shadow-xl backdrop-blur"
          >
            <div className="space-y-6">
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

              <button
                type="submit"
                disabled={busy || !email}
                className="w-full h-14 rounded-xl bg-sky-600 hover:bg-sky-500 transition font-bold text-lg disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>

              {done && (
                <div className="text-sm text-emerald-300">
                  If that email exists, a reset link has been sent.
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
