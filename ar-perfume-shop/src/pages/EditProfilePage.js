// src/pages/EditProfilePage.js
import React, { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  IoCameraOutline,
  IoMailOutline,
  IoPersonOutline,
  IoCallOutline,
  IoLocationOutline,
} from "react-icons/io5";
import http from "../lib/http"; // axios wrapper with JWT
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState({ open: false, which: null });
  const fileRef = useRef(null);
  const { isAuthed } = useAuth();

  // fetch profile (only if logged in)
  useEffect(() => {
    if (isAuthed) {
      http
        .get("me/")
        .then((res) => setProfile(res.data))
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setProfile(null);
        });
    }
  }, [isAuthed]);

  const open = (which) => setModal({ open: true, which });
  const close = () => setModal({ open: false, which: null });

  // --- Guest view ---
  if (!isAuthed) {
    return (
      <div className="min-h-screen w-full bg-[#0c1a3a] flex flex-col items-center justify-center text-white px-6">
        <h1 className="text-3xl font-bold mb-4">Not logged in</h1>
        <p className="mb-6 opacity-80">Please log in to edit your profile.</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-white p-6">Loading profile...</div>;
  }

  // update helper
  const saveField = async (payload) => {
    try {
      const res = await http.patch("me/", payload);
      setProfile(res.data);
      close();
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Update failed, please try again.");
    }
  };

  const handlePickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const formData = new FormData();
    formData.append("avatar", f);
    try {
      const res = await http.patch("me/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile(res.data);
      close();
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      alert("Avatar upload failed.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-[1600px] py-8 text-white text-[18px] md:text-[19px] lg:text-[20px]">
        <PageHeader title="Edit Profile" />

        <div className="grid gap-10 xl:grid-cols-3 items-stretch">
          {/* LEFT avatar */}
          <section className="bg-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[680px]">
            <div className="relative w-[320px] h-[320px] xl:w-[360px] xl:h-[360px] rounded-full overflow-hidden border-8 border-white/80 shadow-2xl">
              <img
                src={profile.avatar || "https://i.pravatar.cc/600?u=" + profile.username}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 bg-black/50 backdrop-blur text-white font-bold px-6 py-2 rounded-full">
                {profile.username || "USER"}
              </div>
            </div>

            <button
              onClick={() => open("avatar")}
              className="mt-8 inline-flex items-center gap-3 bg-white/10 hover:bg-white/15 px-5 py-3 rounded-2xl text-lg"
            >
              <IoCameraOutline className="text-3xl" />
              Upload Profile Picture
            </button>
          </section>

          {/* RIGHT fields */}
          <section className="xl:col-span-2 bg-white/5 rounded-2xl p-8 min-h-[680px]">
            <div className="space-y-5">
              <FieldRow icon={<IoMailOutline />} label={profile.email} onClick={() => open("email")} />
              <FieldRow icon={<IoPersonOutline />} label={profile.username} onClick={() => open("username")} />
              <FieldRow icon={<IoCallOutline />} label={profile.phone} onClick={() => open("phone")} />
              <FieldRow
                icon={<IoLocationOutline />}
                label={
                  `${profile.address_line1 || ""}, ${profile.postal_code || ""} ${profile.city || ""}, ` +
                  `${profile.state || ""}, ${profile.country || ""}`
                }
                onClick={() => open("address")}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {modal.open && modal.which === "avatar" && (
        <Modal title="Change profile picture" onClose={close}>
          <div className="flex flex-col items-center gap-5">
            <div className="w-[340px] h-[340px] rounded-full overflow-hidden bg-black/20 ring-2 ring-white/20">
              <img
                src={profile.avatar || "https://i.pravatar.cc/600?u=" + profile.username}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePickAvatar}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-3 bg-white text-blue-900 rounded-2xl font-semibold text-lg"
            >
              Upload…
            </button>
          </div>
        </Modal>
      )}

      {modal.open && modal.which === "username" && (
        <EditOneLine
          title="Enter your new username"
          initial={profile.username}
          placeholder="Username"
          onSave={(val) => saveField({ username: val })}
          onClose={close}
        />
      )}
      {modal.open && modal.which === "email" && (
        <EditOneLine
          title="Enter your email"
          initial={profile.email}
          placeholder="name@example.com"
          type="email"
          onSave={(val) => saveField({ email: val })}
          onClose={close}
        />
      )}
      {modal.open && modal.which === "phone" && (
        <EditOneLine
          title="Enter your phone"
          initial={profile.phone}
          placeholder="012-345 6789"
          onSave={(val) => saveField({ phone: val })}
          onClose={close}
        />
      )}
      {modal.open && modal.which === "address" && (
        <EditAddress
          initial={profile}
          onSave={(addr) => saveField(addr)}
          onClose={close}
        />
      )}
    </div>
  );
}

/* --------- Bits --------- */
function FieldRow({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 px-6 py-5 rounded-2xl"
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-left grow font-semibold text-lg">{label || "Not set"}</span>
      <span className="opacity-70 text-base">Edit</span>
    </button>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#0c1a3a] text-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 font-semibold text-xl">
          {title}
        </div>
        <div className="p-6">{children}</div>
        <div className="px-6 py-5 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-3 bg-white/10 rounded-2xl text-lg">
            Cancel
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

function EditOneLine({ title, initial, onSave, onClose, placeholder, type = "text" }) {
  const [val, setVal] = useState(initial || "");
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(val)}
          className="px-5 py-3 bg-sky-500 rounded-2xl font-semibold text-lg"
        >
          Save
        </button>
      }
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full bg-white/10 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-sky-500/30 text-lg"
      />
    </Modal>
  );
}

function EditAddress({ initial, onSave, onClose }) {
  const [addr, setAddr] = useState({
    address_line1: initial?.address_line1 || "",
    postal_code: initial?.postal_code || "",
    city: initial?.city || "",
    state: initial?.state || "",
    country: initial?.country || "",
  });

  return (
    <Modal
      title="Update your address"
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(addr)}
          className="px-5 py-3 bg-sky-500 rounded-2xl font-semibold text-lg"
        >
          Save
        </button>
      }
    >
      <div className="grid gap-4">
        <input
          className="bg-white/10 p-4 rounded-2xl text-lg"
          placeholder="Address line"
          value={addr.address_line1}
          onChange={(e) => setAddr({ ...addr, address_line1: e.target.value })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="bg-white/10 p-4 rounded-2xl text-lg"
            placeholder="Postal Code"
            value={addr.postal_code}
            onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })}
          />
          <input
            className="bg-white/10 p-4 rounded-2xl text-lg"
            placeholder="City"
            value={addr.city}
            onChange={(e) => setAddr({ ...addr, city: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="bg-white/10 p-4 rounded-2xl text-lg"
            placeholder="State"
            value={addr.state}
            onChange={(e) => setAddr({ ...addr, state: e.target.value })}
          />
          <input
            className="bg-white/10 p-4 rounded-2xl text-lg"
            placeholder="Country"
            value={addr.country}
            onChange={(e) => setAddr({ ...addr, country: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
