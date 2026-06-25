// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { Dropdown } from "../components/ui";
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

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "zh", label: "中文" },
];

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

  const links = [
    { to: "/settings/about", Icon: IoInformationCircleOutline, label: "About Us" },
    { to: "/settings/retailers", Icon: IoStorefrontOutline, label: "Boutiques" },
    { to: "/settings/help", Icon: IoHelpCircleOutline, label: "Help Center" },
  ];

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.12),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12 md:py-14">
        <div className="mb-10">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-2">Your Preferences</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-white">Account Settings</h1>
          <p className="font-cormorant italic text-xl text-luxury-champagne mt-2">
            Tune the maison to your taste.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Preferences */}
          <section className="glass rounded-3xl p-8">
            <h2 className="font-serif text-2xl text-white mb-7">Preferences</h2>

            {/* Theme */}
            <p className="label uppercase text-[11px] text-luxury-mut mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3 mb-7">
              {themeOptions.map(({ k, label, Icon }) => {
                const active = settings.theme === k;
                return (
                  <button
                    key={k}
                    onClick={() => update({ theme: k })}
                    className={`rounded-xl h-14 flex items-center justify-center gap-2 text-sm border transition ${
                      active
                        ? "border-luxury-gold/70 bg-luxury-gold/12 text-luxury-champagne"
                        : "border-white/12 text-luxury-mut hover:border-luxury-gold/40 hover:text-white"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="text-xl" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Language */}
            <p className="label uppercase text-[11px] text-luxury-mut mb-3">Language</p>
            <div className="mb-7">
              <Dropdown
                value={settings.language}
                onChange={(v) => update({ language: v })}
                options={LANGUAGE_OPTIONS}
                leftIcon={<IoLanguageOutline className="text-luxury-gold2 shrink-0" />}
                className="fld rounded-xl px-4 py-3.5 w-full text-luxury-text"
                menuClassName="w-full"
              />
            </div>

            {/* Notifications */}
            <p className="label uppercase text-[11px] text-luxury-mut mb-3">Notifications</p>
            <div className="space-y-3 mb-8">
              <ToggleRow
                checked={settings.notifications.email}
                onChange={(v) => updateNotifications({ email: v })}
                icon={<IoMailOutline />}
                label="Email updates"
              />
              <ToggleRow
                checked={settings.notifications.push}
                onChange={(v) => updateNotifications({ push: v })}
                icon={<IoNotificationsOutline />}
                label="Push notifications"
              />
              <ToggleRow
                checked={settings.notifications.sms}
                onChange={(v) => updateNotifications({ sms: v })}
                icon={<IoChatbubbleOutline />}
                label="SMS alerts"
              />
            </div>

            <button
              onClick={save}
              className="btn-lux w-full py-4 rounded-full text-[12px] font-medium label uppercase"
            >
              Save Changes
            </button>
          </section>

          {/* More + Danger */}
          <section className="lg:col-span-2 space-y-8">
            <div className="glass rounded-3xl p-8">
              <h2 className="font-serif text-2xl text-white mb-7">More</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {links.map(({ to, Icon, label }) => (
                  <Link key={to} to={to} className="item glass rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center mb-4 text-luxury-gold2">
                      <Icon className="text-xl" />
                    </div>
                    <p className="font-serif text-lg text-white">{label}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              <p className="label uppercase text-[11px] text-red-300/80 mb-2">Danger Zone</p>
              <h3 className="font-serif text-2xl text-white mb-1">Delete account</h3>
              <p className="text-sm text-luxury-mut mb-6">
                This removes your profile &amp; settings on this device and signs you out.
              </p>
              <button
                onClick={() => setConfirm(true)}
                className="px-7 py-3 rounded-full text-[11px] label uppercase border border-red-500/50 text-red-300 hover:bg-red-500/10 transition inline-flex items-center gap-2"
              >
                <IoTrashBinOutline className="text-base" />
                Delete my account
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
      </main>
    </div>
  );
}

function ToggleRow({ checked, onChange, icon, label }) {
  return (
    <div className="item glass rounded-xl px-4 py-3 flex items-center justify-between">
      <span className="inline-flex items-center gap-3 text-luxury-text">
        <span className="w-9 h-9 rounded-lg bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center text-luxury-gold2">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${
          checked ? "bg-luxury-gold" : "bg-white/12"
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
            checked ? "left-[22px] bg-luxury-bg" : "left-0.5 bg-white/70"
          }`}
        />
      </button>
    </div>
  );
}
