import React, { useEffect, useState } from "react";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminModal,
  AdminToast,
  adminInput,
  adminTextarea,
} from "../../components/admin";
import { getImageUrl } from "../../lib/media";

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

  useAdminChrome({ title: "About Page", actions: null, backTo: "/admin/dashboard" });

  // Fetch About Data
  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await http.get("/site/about/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          const about = res.data[0];

          // Parse social_icons if it's a JSON string
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

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setData((prev) => ({ ...prev, hero_image: file }));
  };

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
      setMessage({ type: "success", text: `Updated icon for ${platform}` });
    }
  };

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
            key === "social_icons" // ensure JSON stored properly
          ) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      }

      // Append any new icons
      Object.entries(socialIcons).forEach(([platform, file]) => {
        if (file) formData.append(`social_icon_${platform}`, file);
      });

      const res = await http.patch(`/site/about/${data.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let updated = res.data;

      // Parse social_icons if returned as string
      if (typeof updated.social_icons === "string") {
        try {
          updated.social_icons = JSON.parse(updated.social_icons);
        } catch {
          updated.social_icons = {};
        }
      }

      // Resolve relative media URLs against the API host (derived from
      // REACT_APP_API_BASE_URL), not a hardcoded localhost.
      Object.keys(updated.social_icons || {}).forEach((k) => {
        const val = updated.social_icons[k];
        if (val && !val.startsWith("http")) {
          updated.social_icons[k] = getImageUrl(val);
        }
      });

      setData(updated);
      setSocialIcons({});
      setMessage({ type: "success", text: "About page updated successfully!" });
    } catch (err) {
      console.error("Update failed:", err.response?.data || err);
      setMessage({ type: "error", text: "Failed to update About page." });
    } finally {
      setSaving(false);
    }
  };

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
    setMessage({ type: "info", text: "All content has been reset." });
  };

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
    setMessage({ type: "success", text: `Added ${platform} link!` });
  };

  if (loading)
    return <div className="p-10 text-center text-luxury-mut">Loading About content...</div>;
  if (error) return <div className="p-10 text-center text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
        <AdminField label="Title">
          <input
            type="text"
            value={data?.title || ""}
            onChange={(e) => handleChange("title", e.target.value)}
            className={adminInput}
          />
        </AdminField>

        <AdminField label="Intro Text">
          <input
            type="text"
            value={data?.intro_text || ""}
            onChange={(e) => handleChange("intro_text", e.target.value)}
            className={adminInput}
          />
        </AdminField>

        <AdminField label="Main Body">
          <textarea
            rows={8}
            value={data?.body_text || ""}
            onChange={(e) => handleChange("body_text", e.target.value)}
            className={adminTextarea}
          />
        </AdminField>

        <div className="grid md:grid-cols-2 gap-6">
          <AdminField label="Mission">
            <textarea
              rows={4}
              value={data?.mission || ""}
              onChange={(e) => handleChange("mission", e.target.value)}
              className={adminTextarea}
            />
          </AdminField>
          <AdminField label="Vision">
            <textarea
              rows={4}
              value={data?.vision || ""}
              onChange={(e) => handleChange("vision", e.target.value)}
              className={adminTextarea}
            />
          </AdminField>
        </div>

        <AdminField label="Hero Image">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className={adminInput}
          />
          {data?.hero_image_url && (
            <img
              src={data.hero_image_url}
              alt="Hero"
              className="mt-4 w-full rounded-xl border border-luxury-line"
              style={{ maxHeight: "none", objectFit: "contain" }}
            />
          )}
        </AdminField>

        <div className="grid md:grid-cols-2 gap-6">
          <AdminField label="Contact Email">
            <input
              type="email"
              value={data?.contact_email || ""}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              className={adminInput}
            />
          </AdminField>
          <AdminField label="Contact Phone">
            <input
              type="text"
              value={data?.contact_phone || ""}
              onChange={(e) => handleChange("contact_phone", e.target.value)}
              className={adminInput}
            />
          </AdminField>
        </div>

        <AdminField label="Address">
          <input
            type="text"
            value={data?.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className={adminInput}
          />
        </AdminField>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <div>
              <p className="label uppercase text-[10px] text-luxury-mut">Social Links</p>
              <p className="text-sm text-luxury-mut mt-1">
                Manage name, URL, and icon for each platform.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSocial(true)}
              className="ghost rounded-full px-4 py-2 text-[11px] label uppercase"
            >
              Add Social Link
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(data?.social_links || {}).map(([key, val]) => (
              <div key={key} className="space-y-4">
                <div className="rule" />
                <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className={`${adminInput} xl:w-48 text-luxury-mut`}
                  />

                  <div className="flex items-center gap-3">
                    {socialIcons?.[key] ? (
                      <img
                        src={URL.createObjectURL(socialIcons[key])}
                        alt={key}
                        className="w-9 h-9 rounded bg-white object-contain"
                      />
                    ) : data?.social_icons?.[key] ? (
                      <img
                        src={
                          data.social_icons[key]?.startsWith("http")
                            ? data.social_icons[key]
                            : getImageUrl(data.social_icons[key])
                        }
                        alt={key}
                        className="w-9 h-9 rounded bg-white object-contain"
                      />
                    ) : (
                      <span className="text-xs text-luxury-mut">No icon</span>
                    )}

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
                      type="button"
                      onClick={() =>
                        document.getElementById(`icon-input-${key}`).click()
                      }
                      className="ghost rounded-full px-3 py-1.5 text-[11px] label uppercase"
                    >
                      Change Icon
                    </button>
                  </div>

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
                    className={`${adminInput} flex-1`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...data.social_links };
                      delete updated[key];
                      setData({ ...data, social_links: updated });
                    }}
                    className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-4 z-10 glass rounded-2xl p-4 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-5 py-2 text-[11px] label uppercase"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="btn-lux rounded-full px-6 py-2 text-[11px] label uppercase disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {confirmReset && (
        <AdminConfirm
          open
          title="Reset Content"
          message="Are you sure you want to reset the About content?"
          confirmText="Reset"
          cancelText="Cancel"
          onConfirm={resetContent}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      <AdminModal
        open={showAddSocial}
        title="Add Social Link"
        onClose={() => {
          setNewSocial({ platform: "", url: "", icon: null });
          setShowAddSocial(false);
        }}
        size="sm"
      >
        <div className="space-y-5">
          <AdminField label="Platform">
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
              className={adminInput}
            />
          </AdminField>

          <AdminField label="URL">
            <input
              type="url"
              placeholder="https://instagram.com/gerainchan"
              value={newSocial.url}
              onChange={(e) =>
                setNewSocial((prev) => ({ ...prev, url: e.target.value }))
              }
              className={adminInput}
            />
          </AdminField>

          <AdminField label="Upload Icon">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setNewSocial((prev) => ({ ...prev, icon: file }));
              }}
              className={adminInput}
            />
            {newSocial.icon && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={URL.createObjectURL(newSocial.icon)}
                  alt="preview"
                  className="w-10 h-10 rounded bg-white object-contain"
                />
                <span className="text-sm text-luxury-mut">
                  {newSocial.icon.name}
                </span>
              </div>
            )}
          </AdminField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setNewSocial({ platform: "", url: "", icon: null });
                setShowAddSocial(false);
              }}
              className="ghost rounded-full px-5 py-2 text-[11px] label uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addSocialLink}
              className="btn-lux rounded-full px-6 py-2 text-[11px] label uppercase"
            >
              Add
            </button>
          </div>
        </div>
      </AdminModal>

      {message && (
        <AdminToast
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  );
}
