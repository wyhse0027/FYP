import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';
import { getSettings, patchSettings, resetSettings } from '../store/settingsStore';
import { resetProfile } from '../store/profileStore';
import { useAuth } from '../context/AuthContext';

import {
  IoMoonOutline, IoSunnyOutline, IoDesktopOutline,
  IoLanguageOutline, IoMailOutline, IoNotificationsOutline, IoChatbubbleOutline,
  IoStorefrontOutline, IoInformationCircleOutline, IoHelpCircleOutline,
  IoTrashBinOutline
} from 'react-icons/io5';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [settings, setSettings] = useState(() => getSettings());
  const [confirm, setConfirm] = useState(false);

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }));
  const updateNotifications = (patch) =>
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, ...patch }}));

  const save = () => {
    patchSettings(settings);
    alert('Settings saved');
  };

  const doDelete = () => {
    setConfirm(false);
    // clear local data then sign out
    try { resetSettings(); resetProfile(); } catch {}
    try { logout?.(); } finally { navigate('/signup', { replace: true }); }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-[1600px] py-8 text-white">
        <PageHeader title="Account Setting" />

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: Preferences */}
          <section className="bg-white/5 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Preferences</h2>

            {/* Theme */}
            <div className="mb-6">
              <label className="block text-white/80 mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k:'light',  label:'Light',  Icon:IoSunnyOutline },
                  { k:'dark',   label:'Dark',   Icon:IoMoonOutline },
                  { k:'system', label:'System', Icon:IoDesktopOutline },
                ].map(({k,label,Icon}) => (
                  <button
                    key={k}
                    onClick={() => update({ theme:k })}
                    className={`flex items-center justify-center gap-2 h-14 rounded-xl border
                                ${settings.theme===k ? 'border-sky-400 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <Icon className="text-xl" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="mb-6">
              <label className="block text-white/80 mb-2">Language</label>
              <div className="relative">
                <IoLanguageOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <select
                  value={settings.language}
                  onChange={(e)=>update({ language:e.target.value })}
                  className="w-full bg-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-sky-400/30"
                >
                  <option value="en">English</option>
                  <option value="ms">Bahasa Melayu</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div className="mb-6">
              <label className="block text-white/80 mb-2">Notifications</label>
              <div className="space-y-3">
                <ToggleRow
                  checked={settings.notifications.email}
                  onChange={(v)=>updateNotifications({ email:v })}
                  icon={<IoMailOutline className="text-xl" />}
                  label="Email updates"
                />
                <ToggleRow
                  checked={settings.notifications.push}
                  onChange={(v)=>updateNotifications({ push:v })}
                  icon={<IoNotificationsOutline className="text-xl" />}
                  label="Push notifications"
                />
                <ToggleRow
                  checked={settings.notifications.sms}
                  onChange={(v)=>updateNotifications({ sms:v })}
                  icon={<IoChatbubbleOutline className="text-xl" />}
                  label="SMS alerts"
                />
              </div>
            </div>

            <button
              onClick={save}
              className="w-full h-14 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold"
            >
              Save changes
            </button>
          </section>

          {/* Right: Quick links + Danger zone */}
          <section className="lg:col-span-2 bg-white/5 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold mb-6">More</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <LinkCard to="/settings/about"     Icon={IoInformationCircleOutline} label="About Us" />
              <LinkCard to="/settings/retailers" Icon={IoStorefrontOutline}       label="Retailers" />
              <LinkCard to="/settings/help"      Icon={IoHelpCircleOutline}       label="Help Center" />
            </div>

            <div className="mt-8 border-t border-white/10 pt-8">
              <h3 className="text-xl font-semibold mb-3">Danger zone</h3>
              <button
                onClick={()=>setConfirm(true)}
                className="w-full md:w-auto h-12 px-6 rounded-xl bg-rose-600/90 hover:bg-rose-500 flex items-center gap-3"
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
          onCancel={()=>setConfirm(false)}
          onConfirm={doDelete}
        />
      </div>
    </div>
  );
}

function ToggleRow({ checked, onChange, icon, label }) {
  return (
    <label className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
      <span className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e)=>onChange(e.target.checked)}
        className="h-5 w-5 accent-sky-500"
      />
    </label>
  );
}

function LinkCard({ to, Icon, label }) {
  return (
    <Link
      to={to}
      className="group h-28 rounded-2xl bg-white/10 hover:bg-white/15 flex items-center justify-center gap-3"
    >
      <Icon className="text-3xl text-white/90 group-hover:text-white" />
      <span className="text-xl font-semibold">{label}</span>
    </Link>
  );
}
