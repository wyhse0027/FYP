// Lightweight localStorage store for user settings
const KEY = 'settings_v1';

const defaults = {
  theme: 'system',               // 'light' | 'dark' | 'system'
  language: 'en',                // 'en' | 'ms' | ...
  notifications: { email: true, sms: false, push: true },
  marketing: true,               // promotional emails
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function setSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function patchSettings(patch) {
  const cur = getSettings();
  const merged = { ...cur, ...patch };
  setSettings(merged);
  return merged;
}

export function resetSettings() {
  localStorage.removeItem(KEY);
}

export function resetProfile() {
  localStorage.removeItem(KEY);
}