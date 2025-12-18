// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { getSettings, patchSettings, resetSettings } from "../store/settingsStore";
import { resetProfile } from "../store/profileStore";
import { useAuth } from "../context/AuthContext";

import {
  IoMoonOutline,
  IoSunnyOutline,
  IoDesktopOutline,
  IoLanguageOutline,
  IoMailOutline,
  IoNotificationsOutline,
  IoChatbubbleOutline,
  IoStorefrontOutline,
  IoInformationCircleOutline,
  IoHelpCircleOutline,
  IoTrashBinOutline,
} from "react-icons/io5";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [settings, setSettings] = useState(() => getSettings());
  const [confirm, setConfirm] = useState(false);

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));
  const updateNotifications = (patch) =>
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...patch },
    }));

  const save = () => {
    patchSettings(settings);
    alert("Settings saved");
  };

  const doDelete = () => {
    setConfirm(false);
    try {
      resetSettings();
      resetProfile();
    } catch {}
    try {
      logout?.();
    } finally {
      navigate("/signup", { replace: true });
    }
  };

  const themeOptions = [
    { k: "light", label: "Light", Icon: IoSunnyOutline },
    { k: "dark", label: "Dark", Icon: IoMoonOutline },
    { k: "system", label: "System", Icon: IoDesktopOutline },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden px-6 md:px-10 lg:px-16">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-luxury-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] py-8 text-white">
        <PageHeader title="Account Setting" />

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: Preferences */}
          <section className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6">
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                Preferences
              </span>
            </h2>

            {/* Theme */}
            <div className="mb-6">
              <label className="block text-white/70 mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map(({ k, label, Icon }) => {
                  const active = settings.theme === k;
                  return (
                    <button
                      key={k}
                      onClick={() => update({ theme: k })}
                      className={`flex items-center justify-center gap-2 h-14 rounded-xl border transition-all duration-300
                        ${
                          active
                            ? "border-luxury-gold/60 bg-luxury-gold/10 shadow-[0_0_30px_rgba(212,175,55,0.18)]"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-luxury-gold/25"
                        }`}
                    >
                      <Icon className={`text-xl ${active ? "text-luxury-gold-light" : "text-white/80"}`} />
                      <span className={`font-medium ${active ? "text-white" : "text-white/80"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="mb-6">
              <label className="block text-white/70 mb-2">Language</label>
              <div className="relative">
                <IoLanguageOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <select
                  value={settings.language}
                  onChange={(e) => update({ language: e.target.value })}
                  className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white outline-none
                             focus:border-luxury-gold/50 focus:ring-4 focus:ring-luxury-gold/20"
                >
                  <option className="bg-slate-900" value="en">
                    English
                  </option>
                  <option className="bg-slate-900" value="ms">
                    Bahasa Melayu
                  </option>
                  <option className="bg-slate-900" value="zh">
                    中文
                  </option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div className="mb-6">
              <label className="block text-white/70 mb-2">Notifications</label>
              <div className="space-y-3">
                <ToggleRow
                  checked={settings.notifications.email}
                  onChange={(v) => updateNotifications({ email: v })}
                  icon={<IoMailOutline className="text-xl" />}
                  label="Email updates"
                />
                <ToggleRow
                  checked={settings.notifications.push}
                  onChange={(v) => updateNotifications({ push: v })}
                  icon={<IoNotificationsOutline className="text-xl" />}
                  label="Push notifications"
                />
                <ToggleRow
                  checked={settings.notifications.sms}
                  onChange={(v) => updateNotifications({ sms: v })}
                  icon={<IoChatbubbleOutline className="text-xl" />}
                  label="SMS alerts"
                />
              </div>
            </div>

            <button
              onClick={save}
              className="w-full h-14 rounded-xl font-extrabold text-slate-900
                         bg-gradient-to-r from-luxury-gold to-luxury-gold-light
                         shadow-lg shadow-luxury-gold/20 hover:shadow-luxury-gold/35
                         transition-all duration-300"
            >
              Save changes
            </button>
          </section>

          {/* Right: Quick links + Danger zone */}
          <section className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6">
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                More
              </span>
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <LinkCard to="/settings/about" Icon={IoInformationCircleOutline} label="About Us" />
              <LinkCard to="/settings/retailers" Icon={IoStorefrontOutline} label="Retailers" />
              <LinkCard to="/settings/help" Icon={IoHelpCircleOutline} label="Help Center" />
            </div>

            <div className="mt-10 border-t border-white/10 pt-8">
              <h3 className="text-xl font-semibold mb-3">Danger zone</h3>
              <button
                onClick={() => setConfirm(true)}
                className="w-full md:w-auto h-12 px-6 rounded-xl
                           bg-rose-500/15 border border-rose-500/25 text-rose-200
                           hover:bg-rose-500/20 hover:border-rose-500/35
                           transition-all duration-300 flex items-center gap-3"
              >
                <IoTrashBinOutline className="text-xl" />
                <span className="font-semibold">Delete my account</span>
              </button>
            </div>
          </section>
        </div>

        <ConfirmModal
          open={confirm}
          title="Delete account?"
          message="This will remove your profile & settings on this device and sign you out."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onCancel={() => setConfirm(false)}
          onConfirm={doDelete}
        />
      </div>
    </div>
  );
}

function ToggleRow({ checked, onChange, icon, label }) {
  return (
    <label className="flex items-center justify-between rounded-xl px-4 py-3
                      bg-white/5 border border-white/10 hover:border-luxury-gold/20
                      transition-all duration-300">
      <span className="flex items-center gap-3 text-white/85">
        <span className="p-2 rounded-lg bg-white/5 border border-white/10 text-luxury-gold-light">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[rgb(212,175,55)]"
      />
    </label>
  );
}

function LinkCard({ to, Icon, label }) {
  return (
    <Link
      to={to}
      className="group h-28 rounded-2xl bg-white/5 border border-white/10
                 hover:bg-white/10 hover:border-luxury-gold/25
                 transition-all duration-300 flex items-center justify-center gap-3"
    >
      <Icon className="text-3xl text-luxury-gold/80 group-hover:text-luxury-gold-light transition-colors" />
      <span className="text-xl font-semibold text-white/90 group-hover:text-white transition-colors">
        {label}
      </span>
    </Link>
  );
}
