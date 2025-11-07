// Lightweight localStorage store for profile info
const KEY = 'profile_v1';

const defaultProfile = {
  avatar: '',                 // dataURL string (or empty)
  email: 'user@user.com',
  username: 'USER',
  phone: '012-345 6789',
  address: {
    line1: 'No. 1, Jalan 2, Taman 3,',
    city: '12345 City',
    state: 'State',
    country: 'Country',
  },
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...defaultProfile };
  } catch {
    return { ...defaultProfile };
  }
}

export function setProfile(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateProfile(patch) {
  const cur = getProfile();
  const merged = { ...cur, ...patch };
  setProfile(merged);
  return merged;
}

export function updateAddress(patchAddr) {
  const cur = getProfile();
  const merged = { ...cur, address: { ...cur.address, ...patchAddr } };
  setProfile(merged);
  return merged;
}

export function resetProfile() {
  // You can either remove the key…
  // localStorage.removeItem(KEY);
  // …and let getProfile() fall back to defaults,
  // or just write defaults directly:
  setProfile({ ...defaultProfile });
    return { ...defaultProfile };
 }