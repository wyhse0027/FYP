// src/pages/admin/AdminAREditPage.js
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminField,
  AdminToggle,
  adminInput,
} from "../../components/admin";
import Dropdown from "../../components/ui/Dropdown";

const TYPE_OPTIONS = [
  { value: "MARKER", label: "Marker-based" },
  { value: "MARKERLESS", label: "Markerless" },
];

/* -------------------- Cloud storage direct upload helpers -------------------- */
async function presignBigFile(kind, file) {
  const res = await http.post("/uploads/presign/", {
    kind,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
  });
  return res.data;
}

async function uploadBigFile(kind, file) {
  const { upload_url, key, upload_token } = await presignBigFile(kind, file);
  const response = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error(`Storage upload failed: ${response.status}`);
  return { key, upload_token };
}

async function finalizeBigFile(arId, kind, upload) {
  await http.patch(`/ar/${arId}/finalize-bigfile/`, {
    kind,
    key: upload.key,
    upload_token: upload.upload_token,
  });
}

export default function AdminAREditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product: "",
    type: "MARKER",
    app_download_file: null, // string url OR File
    marker_image: null, // string url OR File
    model_glb: null, // string url OR File
    marker_mind: null, // string url OR File
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fetching, setFetching] = useState(!!id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goBack = () => navigate("/admin/ar-management");

  useAdminChrome({
    title: id ? "Edit AR Experience" : "Create AR Experience",
    backTo: "/admin/ar-management",
    actions: null,
  });

  /* -------------------- Delete handlers -------------------- */
  const handleDeleteMarker = async () => {
    if (!id) return;
    try {
      await http.patch(`/ar/${id}/`, { marker_image: null });
      setForm((prev) => ({ ...prev, marker_image: null }));
      setMessage("Marker image deleted successfully!");
    } catch (err) {
      console.error("Failed to delete marker image:", err);
      setMessage("Failed to delete marker image.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteGLB = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-bigfile/?kind=glb`);
      setForm((prev) => ({ ...prev, model_glb: null }));
      setMessage("GLB deleted from cloud storage + database successfully!");
    } catch (err) {
      console.error("Failed to delete GLB:", err);
      setMessage(`Failed to delete GLB. ${err?.response?.data?.detail || ""}`);
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteMind = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-mind/`);
      setForm((prev) => ({ ...prev, marker_mind: null }));
      setMessage("MindAR file deleted successfully!");
    } catch (err) {
      console.error("Failed to delete MindAR file:", err);
      setMessage("Failed to delete MindAR file.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteApk = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-bigfile/?kind=apk`);
      setForm((prev) => ({ ...prev, app_download_file: null }));
      setMessage("APK deleted from cloud storage + database successfully!");
    } catch (err) {
      console.error("Failed to delete APK:", err);
      setMessage(`Failed to delete APK. ${err?.response?.data?.detail || ""}`);
    } finally {
      setConfirmDelete(false);
    }
  };

  /* -------------------- Load products -------------------- */
  useEffect(() => {
    http
      .get("/products/")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Failed to fetch products:", err));
  }, []);

  /* -------------------- Load existing AR -------------------- */
  useEffect(() => {
    if (!id) return;

    async function fetchAR() {
      try {
        const res = await http.get(`/ar/${id}/`);
        const data = res.data;
        setForm({
          product: data.product?.id || "",
          type: data.type || "MARKER",
          app_download_file: data.app_download_file_url || null,
          marker_image: data.marker_image_url || null,
          model_glb: data.model_glb_url || null,
          marker_mind: data.marker_mind_url || null,
          enabled: data.enabled ?? true,
        });
      } catch (err) {
        console.error("Failed to fetch AR experience:", err);
        setMessage("Failed to load AR experience data.");
      } finally {
        setFetching(false);
      }
    }

    fetchAR();
  }, [id]);

  /* -------------------- Input change -------------------- */
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setForm({ ...form, [name]: checked });
    } else if (type === "file") {
      setForm({ ...form, [name]: files?.[0] || null });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // 1) Upload big files to cloud storage first (GLB/APK only)
      let glbUpload = null;
      let apkUpload = null;

      if (form.model_glb instanceof File) {
        setMessage("Uploading GLB to cloud storage...");
        glbUpload = await uploadBigFile("glb", form.model_glb);
      }

      if (form.app_download_file instanceof File) {
        setMessage("Uploading APK to cloud storage...");
        apkUpload = await uploadBigFile("apk", form.app_download_file);
      }

      // 2) Save the ARExperience (small multipart for marker_image + mind + fields)
      const formData = new FormData();
      formData.append("product_id", form.product);
      formData.append("type", form.type);
      formData.append("enabled", form.enabled);

      // IMPORTANT: keep these via Django multipart (small enough)
      if (form.marker_image instanceof File) {
        formData.append("marker_image", form.marker_image);
      }
      if (form.marker_mind instanceof File) {
        formData.append("marker_mind", form.marker_mind);
      }

      // DO NOT append model_glb / app_download_file (big files)
      let arId = id;

      if (id) {
        setMessage("Saving AR data...");
        await http.patch(`/ar/${id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        arId = id;
      } else {
        setMessage("Creating AR record...");
        const res = await http.post("/ar/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        arId = res.data?.id;
        if (!arId) {
          throw new Error("Create AR succeeded but no id returned. Ensure serializer includes id.");
        }
      }

      // 3) Finalize: save cloud storage keys into FileFields (no upload through Django)
      if (glbUpload) {
        setMessage("Linking GLB to AR record...");
        await finalizeBigFile(arId, "glb", glbUpload);
      }

      if (apkUpload) {
        setMessage("Linking APK to AR record...");
        await finalizeBigFile(arId, "apk", apkUpload);
      }

      setMessage(id ? "AR experience updated successfully!" : "AR experience created successfully!");
      setTimeout(() => navigate("/admin/ar-management"), 1200);
    } catch (err) {
      console.error("Failed to save AR:", err);
      setMessage(`Failed to save AR experience. ${err?.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  const productOptions = useMemo(
    () => [
      { value: "", label: "Select a product" },
      ...products.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [products]
  );

  const deleteTargetLabel =
    confirmDelete?.type === "marker"
      ? "marker image"
      : confirmDelete?.type === "glb"
      ? "3D model (.glb)"
      : confirmDelete?.type === "apk"
      ? "APK file"
      : "MindAR target (.mind)";

  const confirmDeleteHandler =
    confirmDelete?.type === "marker"
      ? handleDeleteMarker
      : confirmDelete?.type === "glb"
      ? handleDeleteGLB
      : confirmDelete?.type === "apk"
      ? handleDeleteApk
      : handleDeleteMind;

  /* -------------------- Loading UI -------------------- */
  if (fetching)
    return (
      <div className="glass rounded-2xl p-8 text-center text-luxury-mut">
        Loading AR experience data...
      </div>
    );

  /* -------------------- UI -------------------- */
  return (
    <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <AdminField label="Product" required>
            <Dropdown
              value={String(form.product || "")}
              onChange={(value) =>
                handleChange({ target: { name: "product", value } })
              }
              options={productOptions}
              className="fld w-full rounded-lg px-4 py-3 text-sm"
              align="right"
            />
          </AdminField>

          <AdminField label="AR Type">
            <Dropdown
              value={form.type}
              onChange={(value) =>
                handleChange({ target: { name: "type", value } })
              }
              options={TYPE_OPTIONS}
              className="fld w-full rounded-lg px-4 py-3 text-sm"
              align="right"
            />
          </AdminField>
        </div>

        <AdminField label="App Download (.apk)">
          {typeof form.app_download_file === "string" && form.app_download_file && (
            <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex flex-wrap items-center gap-3">
              <a
                href={form.app_download_file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-luxury-gold2 hover:text-luxury-champagne text-sm"
              >
                Download current APK
              </a>
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: "apk" })}
                className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
              >
                Delete
              </button>
            </div>
          )}

          <input
            type="file"
            name="app_download_file"
            accept=".apk"
            onChange={handleChange}
            className={adminInput}
          />
          <p className="text-xs text-luxury-mut mt-2">
            Note: APK uploads go directly to cloud storage (faster, avoids backend timeouts).
          </p>
        </AdminField>

        <AdminField label="Marker Image">
          {typeof form.marker_image === "string" && form.marker_image && (
            <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 inline-block">
              <img
                src={form.marker_image}
                alt="Marker"
                className="w-32 h-32 object-cover rounded-lg border border-luxury-line"
              />
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: "marker" })}
                className="mt-3 border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
                title="Delete marker image"
              >
                Delete
              </button>
            </div>
          )}
          <input
            type="file"
            name="marker_image"
            accept="image/*"
            onChange={handleChange}
            className={adminInput}
          />
        </AdminField>

        <AdminField label="3D Model (.glb)">
          {typeof form.model_glb === "string" && form.model_glb && (
            <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex flex-wrap items-center gap-3">
              <a
                href={form.model_glb}
                target="_blank"
                rel="noopener noreferrer"
                className="text-luxury-gold2 hover:text-luxury-champagne text-sm"
              >
                View current model
              </a>
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: "glb" })}
                className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
              >
                Delete
              </button>
            </div>
          )}
          <input
            type="file"
            name="model_glb"
            accept=".glb"
            onChange={handleChange}
            className={adminInput}
          />
          <p className="text-xs text-luxury-mut mt-2">
            Note: GLB uploads go directly to cloud storage (faster, avoids backend timeouts).
          </p>
        </AdminField>

        <AdminField label="MindAR Target (.mind)">
          {typeof form.marker_mind === "string" && form.marker_mind && (
            <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex flex-wrap items-center gap-3">
              <a
                href={form.marker_mind}
                target="_blank"
                rel="noopener noreferrer"
                className="text-luxury-gold2 hover:text-luxury-champagne text-sm"
              >
                Download current file
              </a>
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: "mind" })}
                className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px] label uppercase"
              >
                Delete
              </button>
            </div>
          )}
          <input
            type="file"
            name="marker_mind"
            accept=".mind"
            onChange={handleChange}
            className={adminInput}
          />
        </AdminField>

        <AdminToggle
          checked={form.enabled}
          onChange={(checked) =>
            handleChange({ target: { name: "enabled", type: "checkbox", checked } })
          }
          label="Enabled"
        />

        {message && (
          <div className="glass rounded-xl border border-luxury-line p-3 text-center text-sm text-luxury-mut">
            {message}
          </div>
        )}

        <div className="sticky bottom-4 z-10 glass rounded-2xl p-4 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="ghost rounded-full px-5 py-2 text-[11px] label uppercase"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-lux rounded-full px-6 py-2 text-[11px] label uppercase disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : id ? "Update AR" : "Create AR"}
          </button>
        </div>
      </form>

      <AdminConfirm
        open={!!confirmDelete}
        title="Delete File"
        message={`Are you sure you want to delete this ${deleteTargetLabel} file? This action cannot be undone.`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmDeleteHandler}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
