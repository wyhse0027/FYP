// src/pages/EditProfilePage.js
import React, { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  IoCameraOutline,
  IoMailOutline,
  IoPersonOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCloseOutline,
} from "react-icons/io5";
import http from "../lib/http";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState({ open: false, which: null });
  const fileRef = useRef(null);
  const { isAuthed } = useAuth();

  useEffect(() => {
    if (!isAuthed) return;
    http
      .get("me/")
      .then((res) => setProfile(res.data))
      .catch((err) => {
        console.error("Error fetching profile:", err);
        setProfile(null);
      });
  }, [isAuthed]);

  const open = (which) => setModal({ open: true, which });
  const close = () => setModal({ open: false, which: null });

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

  // Guest view
  if (!isAuthed) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center text-white px-6">
        <h1 className="text-3xl font-bold mb-4">Not logged in</h1>
        <p className="mb-6 text-white/70">Please log in to edit your profile.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6">
        Loading profile...
      </div>
    );
  }

  const addressLabel = [
    profile.address_line1,
    profile.address_line2,
    profile.postal_code || "",
    profile.city || "",
    profile.state || "",
    profile.country || "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900
                 relative overflow-hidden px-4 sm:px-6 md:px-10 lg:px-16"
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-luxury-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] py-6 sm:py-8 text-white">
        <PageHeader title="Edit Profile" />

        <div className="grid gap-6 sm:gap-8 xl:grid-cols-3 items-stretch">
          {/* LEFT avatar */}
          <section
            className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10
                       p-5 sm:p-6 md:p-8
                       flex flex-col items-center justify-center
                       min-h-0 xl:min-h-[680px]
                       shadow-2xl"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-6 sm:mb-8">
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                Profile Picture
              </span>
            </h2>

            <div className="relative flex flex-col items-center">
              {/* gold rings */}
              <div className="absolute -inset-2 sm:-inset-3 rounded-full border border-luxury-gold/25 pointer-events-none" />
              <div className="absolute -inset-5 sm:-inset-7 rounded-full border border-luxury-gold/10 pointer-events-none" />

              <div
                className="relative
                           w-40 h-40 xs:w-44 xs:h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 xl:w-[360px] xl:h-[360px]
                           rounded-full overflow-hidden
                           border-[6px] sm:border-8 border-white/80 shadow-2xl"
              >
                <img
                  src={profile.avatar || `https://i.pravatar.cc/600?u=${profile.username}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />

                {/* bottom fade + name */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4
                             bg-black/45 backdrop-blur text-white font-bold
                             px-4 sm:px-6 py-1.5 sm:py-2
                             rounded-full border border-white/10
                             max-w-[85%] truncate"
                >
                  {profile.username || "USER"}
                </div>
              </div>

              {/* ✅ Phone UI: icon-only. PC UI stays the same */}
              <button
                onClick={() => open("avatar")}
                className="mt-6 sm:mt-8 inline-flex items-center justify-center gap-3
                           p-3 sm:px-6 sm:py-3 rounded-2xl text-base sm:text-lg font-semibold
                           bg-white/10 hover:bg-white/15 border border-white/10 hover:border-luxury-gold/25
                           transition-all duration-300"
                aria-label="Change Photo"
                title="Change Photo"
              >
                <IoCameraOutline className="text-2xl sm:text-3xl text-luxury-gold-light" />
                <span className="hidden sm:inline">Change Photo</span>
              </button>
            </div>
          </section>

          {/* RIGHT fields */}
          <section
            className="xl:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10
                       p-5 sm:p-6 md:p-8
                       min-h-0 xl:min-h-[680px]
                       shadow-2xl"
          >
            {/* ✅ Phone UI: shorter title so it doesn’t push layout to the right */}
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-5 sm:mb-6">
              <span className="sm:hidden bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                Info
              </span>
              <span className="hidden sm:inline bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
                Personal Information
              </span>
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <FieldRow
                icon={<IoMailOutline />}
                title="Email"
                label={profile.email}
                onClick={() => open("email")}
              />
              <FieldRow
                icon={<IoPersonOutline />}
                title="Username"
                label={profile.username}
                onClick={() => open("username")}
                /* ✅ Phone UI: one-line only, show full value via horizontal scroll */
                nowrap
              />
              <FieldRow
                icon={<IoCallOutline />}
                title="Phone"
                label={profile.phone}
                onClick={() => open("phone")}
              />
              <FieldRow
                icon={<IoLocationOutline />}
                title="Shipping Address"
                label={addressLabel}
                onClick={() => open("address")}
                multiline
              />
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {modal.open && modal.which === "avatar" && (
        <Modal title="Change profile picture" onClose={close}>
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-3 rounded-full border border-luxury-gold/15 pointer-events-none" />
              <div
                className="w-44 h-44 sm:w-[260px] sm:h-[260px] md:w-[320px] md:h-[320px]
                           rounded-full overflow-hidden bg-black/20 ring-2 ring-white/20"
              >
                <img
                  src={profile.avatar || `https://i.pravatar.cc/600?u=${profile.username}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
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
              className="px-6 py-3 rounded-2xl font-semibold text-base sm:text-lg text-slate-900
                         bg-gradient-to-r from-luxury-gold to-luxury-gold-light
                         shadow-lg shadow-luxury-gold/20 hover:shadow-luxury-gold/35 transition-all duration-300"
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
        <EditAddress initial={profile} onSave={(addr) => saveField(addr)} onClose={close} />
      )}
    </div>
  );
}

/* ---------------- UI Bits ---------------- */

function FieldRow({ icon, title, label, onClick, multiline, nowrap }) {
  const value = label || "Not set";

  return (
    <button
      onClick={onClick}
      className="w-full group rounded-2xl px-4 sm:px-6 py-4 sm:py-5 text-left
                 bg-white/5 border border-white/10
                 hover:bg-white/10 hover:border-luxury-gold/25
                 transition-all duration-300"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="mt-0.5 flex-shrink-0 p-2.5 sm:p-3 rounded-xl
                     bg-white/5 border border-white/10
                     text-luxury-gold-light"
        >
          <span className="text-xl sm:text-2xl">{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm text-white/60 mb-1">{title}</div>

          {/* ✅ Username fix: one-line only + flexible length (scroll on phone) */}
          <div
            className={[
              "font-semibold text-white/90 overflow-hidden",
              multiline ? "text-sm sm:text-base leading-relaxed break-words" : "text-base sm:text-lg",
              !label ? "opacity-70 italic font-medium" : "",
              nowrap ? "whitespace-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]" : "break-words",
            ].join(" ")}
          >
            {/* hide scrollbar (webkit) */}
            <style>{`
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <span className={nowrap ? "hide-scrollbar inline-block" : ""}>{value}</span>
          </div>
        </div>

        {/* ✅ Phone UI: remove "Edit" text so the whole section doesn't look pushed to the right */}
        <div className="hidden sm:block self-center text-xs sm:text-sm text-white/55 group-hover:text-luxury-gold-light transition">
          Edit
        </div>
      </div>
    </button>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl
                   bg-gradient-to-br from-[#0c1a3a] via-[#0b1733] to-[#0c1a3a]
                   border border-luxury-gold/20
                   max-h-[85vh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between">
          <div className="font-semibold text-lg sm:text-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-light to-luxury-gold bg-clip-text text-transparent">
            {title}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white"
            aria-label="Close"
          >
            <IoCloseOutline className="text-2xl" />
          </button>
        </div>

        <div className="p-4 sm:p-6 text-white overflow-y-auto">{children}</div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-base sm:text-lg transition text-white"
          >
            Cancel
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

function EditOneLine({
  title,
  initial,
  onSave,
  onClose,
  placeholder,
  type = "text",
}) {
  const [val, setVal] = useState(initial || "");

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(val)}
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-semibold text-base sm:text-lg text-slate-900
                     bg-gradient-to-r from-luxury-gold to-luxury-gold-light
                     shadow-lg shadow-luxury-gold/20 hover:shadow-luxury-gold/35 transition-all duration-300"
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
        className="w-full bg-white/10 border border-white/10 p-3.5 sm:p-4 rounded-2xl outline-none text-white
                   focus:border-luxury-gold/40 focus:ring-4 focus:ring-luxury-gold/20 text-base sm:text-lg"
      />
    </Modal>
  );
}

function EditAddress({ initial, onSave, onClose }) {
  const [addr, setAddr] = useState({
    address_line1: initial?.address_line1 || "",
    address_line2: initial?.address_line2 || "",
    postal_code: initial?.postal_code || "",
    city: initial?.city || "",
    state: initial?.state || "",
    country: initial?.country || "",
  });

  const inputClass =
    "bg-white/10 border border-white/10 p-3.5 sm:p-4 rounded-2xl text-base sm:text-lg outline-none text-white " +
    "focus:border-luxury-gold/40 focus:ring-4 focus:ring-luxury-gold/20";

  return (
    <Modal
      title="Update your address"
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(addr)}
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-semibold text-base sm:text-lg text-slate-900
                     bg-gradient-to-r from-luxury-gold to-luxury-gold-light
                     shadow-lg shadow-luxury-gold/20 hover:shadow-luxury-gold/35 transition-all duration-300"
        >
          Save
        </button>
      }
    >
      <div className="grid gap-3 sm:gap-4">
        <input
          className={inputClass}
          placeholder="Address line 1"
          value={addr.address_line1}
          onChange={(e) => setAddr({ ...addr, address_line1: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Address line 2 (optional)"
          value={addr.address_line2}
          onChange={(e) => setAddr({ ...addr, address_line2: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            className={inputClass}
            placeholder="Postal Code"
            value={addr.postal_code}
            onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="City"
            value={addr.city}
            onChange={(e) => setAddr({ ...addr, city: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            className={inputClass}
            placeholder="State"
            value={addr.state}
            onChange={(e) => setAddr({ ...addr, state: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Country"
            value={addr.country}
            onChange={(e) => setAddr({ ...addr, country: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
