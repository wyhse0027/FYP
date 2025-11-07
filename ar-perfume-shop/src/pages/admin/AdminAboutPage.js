import React, { useEffect, useState } from "react";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";
import ConfirmModal from "../../components/ConfirmModal";

export default function AdminAboutPage() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [newSocial, setNewSocial] = useState({ platform: "", url: "" });
  const [socialIcons, setSocialIcons] = useState({});

  // ─────────────────────────────
  // Auto-hide toast
  // ─────────────────────────────
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ─────────────────────────────
  // Fetch About Data
  // ─────────────────────────────
  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await http.get("/site/about/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          const about = res.data[0];

          // ✅ Parse social_icons if it's a JSON string
          if (typeof about.social_icons === "string") {
            try {
              about.social_icons = JSON.parse(about.social_icons);
            } catch {
              about.social_icons = {};
            }
          }

          setData(about);
        } else {
          const createRes = await http.post("/site/about/", {
            title: "About GERAIN CHAN",
            intro_text: "",
            body_text: "",
            mission: "",
            vision: "",
            contact_email: "",
            contact_phone: "",
            address: "",
            social_links: {},
          });
          setData(createRes.data);
        }
      } catch (err) {
        console.error("Error fetching About:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  // ─────────────────────────────
  // Input Handlers
  // ─────────────────────────────
  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setData((prev) => ({ ...prev, hero_image: file }));
  };

  // ✅ Handle social icon uploads (triggered by button)
  const handleSocialIconUpload = (platform, file) => {
    if (file) {
      setSocialIcons((prev) => ({ ...prev, [platform]: file }));
      setData((prev) => ({
        ...prev,
        social_icons: {
          ...prev.social_icons,
          [platform]: URL.createObjectURL(file), // show immediately
        },
      }));
      setMessage({ type: "success", text: `✅ Updated icon for ${platform}` });
    }
  };

  // ─────────────────────────────
  // Save Changes
  // ─────────────────────────────
  const saveChanges = async () => {
    if (!data) return;
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          if (
            key === "social_links" ||
            key === "gallery_images" ||
            key === "social_icons" // ✅ ensure JSON stored properly
          ) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      }

      // ✅ Append any new icons
      Object.entries(socialIcons).forEach(([platform, file]) => {
        if (file) formData.append(`social_icon_${platform}`, file);
      });

      const res = await http.patch(`/site/about/${data.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

        let updated = res.data;

        // ✅ Parse social_icons if returned as string
        if (typeof updated.social_icons === "string") {
        try {
            updated.social_icons = JSON.parse(updated.social_icons);
        } catch {
            updated.social_icons = {};
        }
        }

        // ✅ Fix relative URLs
        Object.keys(updated.social_icons || {}).forEach((k) => {
        const val = updated.social_icons[k];
        if (val && !val.startsWith("http")) {
            updated.social_icons[k] = `http://127.0.0.1:8000${val}`;
        }
        });

        setData(updated);
        setSocialIcons({});
        setMessage({ type: "success", text: "✅ About page updated successfully!" });
    } catch (err) {
      console.error("Update failed:", err.response?.data || err);
      setMessage({ type: "error", text: "❌ Failed to update About page." });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────
  // Reset Handler
  // ─────────────────────────────
  const resetContent = () => {
    setData({
      ...data,
      title: "About GERAIN CHAN",
      intro_text: "",
      body_text: "",
      mission: "",
      vision: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      social_links: {},
    });
    setConfirmReset(false);
    setMessage({ type: "info", text: "⚙️ All content has been reset." });
  };

  // ─────────────────────────────
  // Add New Social Link
  // ─────────────────────────────
  const addSocialLink = () => {
    const { platform, url, icon } = newSocial;
    if (!platform || !url) return;
    const p = platform.toLowerCase();

    setData((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [p]: url },
    }));

    if (icon) {
      setSocialIcons((prev) => ({ ...prev, [p]: icon }));
      setData((prev) => ({
        ...prev,
        social_icons: { ...prev.social_icons, [p]: URL.createObjectURL(icon) },
      }));
    }

    setNewSocial({ platform: "", url: "", icon: null });
    setShowAddSocial(false);
    setMessage({ type: "success", text: `🌐 Added ${platform} link!` });
  };

  // ─────────────────────────────
  // UI Render States
  // ─────────────────────────────
  if (loading)
    return <div className="p-10 text-center text-white">Loading About content...</div>;
  if (error) return <div className="p-10 text-center text-red-400">{error}</div>;

  // ─────────────────────────────
  // MAIN UI
  // ─────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-24 py-10">
      <div className="max-w-[1200px] mx-auto">
        <PageHeader title="Edit About Page" />

        {/* Toast Message */}
        {message && (
          <div
            className={`fixed top-6 right-6 z-[9999] px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
              message.type === "success"
                ? "bg-green-600"
                : message.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white/10 p-8 rounded-2xl shadow-lg space-y-6">
          {/* ─── Title ─── */}
          <div>
            <label className="block font-semibold mb-1">Title</label>
            <input
              type="text"
              value={data?.title || ""}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/20 text-white"
            />
          </div>

          {/* ─── Intro ─── */}
          <div>
            <label className="block font-semibold mb-1">Intro Text</label>
            <input
              type="text"
              value={data?.intro_text || ""}
              onChange={(e) => handleChange("intro_text", e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/20 text-white"
            />
          </div>

          {/* ─── Body ─── */}
          <div>
            <label className="block font-semibold mb-1">Main Body</label>
            <textarea
              rows={8}
              value={data?.body_text || ""}
              onChange={(e) => handleChange("body_text", e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/20 text-white resize-none"
            />
          </div>

          {/* ─── Mission & Vision ─── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-1">Mission</label>
              <textarea
                rows={4}
                value={data?.mission || ""}
                onChange={(e) => handleChange("mission", e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-white/20 text-white resize-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Vision</label>
              <textarea
                rows={4}
                value={data?.vision || ""}
                onChange={(e) => handleChange("vision", e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-white/20 text-white resize-none"
              />
            </div>
          </div>

          {/* ─── Hero Image ─── */}
          <div>
            <label className="block font-semibold mb-1">Hero Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-white/80"
            />
            {data?.hero_image_url && (
              <img
                src={data.hero_image_url}
                alt="Hero"
                className="mt-3 w-full rounded-lg"
                style={{ maxHeight: "none", objectFit: "contain" }}
              />
            )}
          </div>

          {/* ─── Contact Info ─── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-1">Contact Email</label>
              <input
                type="email"
                value={data?.contact_email || ""}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-white/20 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Contact Phone</label>
              <input
                type="text"
                value={data?.contact_phone || ""}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-white/20 text-white"
              />
            </div>
          </div>

          {/* ─── Address ─── */}
          <div>
            <label className="block font-semibold mb-1">Address</label>
            <input
              type="text"
              value={data?.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/20 text-white"
            />
          </div>

          {/* ─── Social Links ─── */}
          <div>
            <label className="block font-semibold mb-1">Social Links</label>
            <p className="text-sm text-white/60 mb-2">
              Manage name, URL, and icon for each platform.
            </p>

            {Object.entries(data?.social_links || {}).map(([key, val]) => (
              <div
                key={key}
                className="flex flex-col md:flex-row md:items-center gap-4 mb-4 border-b border-white/10 pb-4"
              >
                {/* Platform Name */}
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="md:w-1/5 rounded-lg px-3 py-2 bg-white/20 text-white/70"
                />

                {/* Icon Preview + Button */}
                <div className="flex items-center gap-3">
                    {socialIcons?.[key] ? (
                    // 🔥 Show local preview for newly uploaded (unsaved) file
                    <img
                        src={URL.createObjectURL(socialIcons[key])}
                        alt={key}
                        className="w-8 h-8 rounded bg-white object-contain"
                    />
                    ) : data?.social_icons?.[key] ? (
                    // ✅ Otherwise show the existing backend icon
                    <img
                        src={
                        data.social_icons[key]?.startsWith("http")
                            ? data.social_icons[key]
                            : `http://127.0.0.1:8000${data.social_icons[key]}`
                        }
                        alt={key}
                        className="w-8 h-8 rounded bg-white object-contain"
                    />
                    ) : (
                    <span className="text-xs text-white/50">No icon</span>
                    )}

                  {/* ✅ Hidden Input Triggered by Button */}
                  <input
                    type="file"
                    accept="image/*"
                    id={`icon-input-${key}`}
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleSocialIconUpload(key, e.target.files[0])
                    }
                  />
                  <button
                    onClick={() =>
                      document.getElementById(`icon-input-${key}`).click()
                    }
                    className="px-2 py-1 bg-blue-500/60 hover:bg-blue-600 rounded text-sm"
                  >
                    Change Icon
                  </button>
                </div>

                {/* URL */}
                <input
                  type="url"
                  value={val}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      social_links: {
                        ...prev.social_links,
                        [key]: e.target.value,
                      },
                    }))
                  }
                  className="flex-1 rounded-lg px-3 py-2 bg-white/20 text-white"
                />

                {/* Remove */}
                <button
                  onClick={() => {
                    const updated = { ...data.social_links };
                    delete updated[key];
                    setData({ ...data, social_links: updated });
                  }}
                  className="text-red-400 hover:text-red-200 text-lg"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => setShowAddSocial(true)}
              className="mt-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30"
            >
              + Add Social Link
            </button>
          </div>

          {/* ─── Actions ─── */}
          <div className="flex justify-between items-center mt-10">
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 bg-red-500/70 hover:bg-red-500 rounded-lg text-white"
            >
              Reset
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <ConfirmModal
          open={confirmReset}
          title="Reset Content"
          message="Are you sure you want to reset the About content?"
          confirmText="Reset"
          cancelText="Cancel"
          onConfirm={resetContent}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {/* Add Social Link Modal */}
      {showAddSocial && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[10000]">
          <div className="bg-[#142750] p-6 rounded-xl shadow-lg w-[420px] text-white space-y-5">
            <h3 className="text-lg font-semibold">Add Social Link</h3>

            {/* Platform */}
            <div>
              <label className="block text-sm mb-1 text-white/80">
                Platform
              </label>
              <input
                type="text"
                placeholder="e.g. Instagram"
                value={newSocial.platform}
                onChange={(e) =>
                  setNewSocial((prev) => ({
                    ...prev,
                    platform: e.target.value,
                  }))
                }
                className="w-full p-2 rounded bg-white/10 border border-white/20"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm mb-1 text-white/80">URL</label>
              <input
                type="url"
                placeholder="https://instagram.com/gerainchan"
                value={newSocial.url}
                onChange={(e) =>
                  setNewSocial((prev) => ({ ...prev, url: e.target.value }))
                }
                className="w-full p-2 rounded bg-white/10 border border-white/20"
              />
            </div>

            {/* Icon Upload */}
            <div>
              <label className="block text-sm mb-1 text-white/80">
                Upload Icon (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) setNewSocial((prev) => ({ ...prev, icon: file }));
                }}
                className="w-full text-sm text-white/80"
              />
              {newSocial.icon && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(newSocial.icon)}
                    alt="preview"
                    className="w-10 h-10 rounded bg-white object-contain"
                  />
                  <span className="text-sm text-white/60">
                    {newSocial.icon.name}
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setNewSocial({ platform: "", url: "", icon: null });
                  setShowAddSocial(false);
                }}
                className="px-4 py-2 bg-gray-500/60 hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addSocialLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
