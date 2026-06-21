// src/pages/admin/AdminAREditPage.js
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import http from "../../lib/http";

/* -------------------- R2 direct upload helpers -------------------- */
async function presignR2(kind, file) {
  const res = await http.post("/uploads/r2-presign/", {
    kind,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
  });
  return res.data; // { upload_url, public_url, key }
}

async function putToR2(uploadUrl, file) {
  const resp = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!resp.ok) {
    throw new Error(`R2 PUT failed: ${resp.status}`);
  }
}

async function uploadBigFileToR2(kind, file) {
  const { upload_url, key } = await presignR2(kind, file);
  await putToR2(upload_url, file);
  return key;
}

async function finalizeBigFile(arId, kind, key) {
  await http.patch(`/ar/${arId}/finalize-bigfile/`, { kind, key });
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

  /* -------------------- Delete handlers -------------------- */
  const handleDeleteMarker = async () => {
    if (!id) return;
    try {
      await http.patch(`/ar/${id}/`, { marker_image: null });
      setForm((prev) => ({ ...prev, marker_image: null }));
      setMessage("✅ Marker image deleted successfully!");
    } catch (err) {
      console.error("Failed to delete marker image:", err);
      setMessage("❌ Failed to delete marker image.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteGLB = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-bigfile/?kind=glb`);
      setForm((prev) => ({ ...prev, model_glb: null }));
      setMessage("✅ GLB deleted from R2 + database successfully!");
    } catch (err) {
      console.error("Failed to delete GLB:", err);
      setMessage(`❌ Failed to delete GLB. ${err?.response?.data?.detail || ""}`);
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteMind = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-mind/`);
      setForm((prev) => ({ ...prev, marker_mind: null }));
      setMessage("✅ MindAR file deleted successfully!");
    } catch (err) {
      console.error("Failed to delete MindAR file:", err);
      setMessage("❌ Failed to delete MindAR file.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleDeleteApk = async () => {
    if (!id) return;
    try {
      await http.delete(`/ar/${id}/delete-bigfile/?kind=apk`);
      setForm((prev) => ({ ...prev, app_download_file: null }));
      setMessage("✅ APK deleted from R2 + database successfully!");
    } catch (err) {
      console.error("Failed to delete APK:", err);
      setMessage(`❌ Failed to delete APK. ${err?.response?.data?.detail || ""}`);
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
        setMessage("❌ Failed to load AR experience data.");
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
      // 1) Upload big files to R2 first (GLB/APK only)
      let glbKey = null;
      let apkKey = null;

      if (form.model_glb instanceof File) {
        setMessage("⬆️ Uploading GLB to R2...");
        glbKey = await uploadBigFileToR2("glb", form.model_glb);
      }

      if (form.app_download_file instanceof File) {
        setMessage("⬆️ Uploading APK to R2...");
        apkKey = await uploadBigFileToR2("apk", form.app_download_file);
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
        setMessage("💾 Saving AR data...");
        await http.patch(`/ar/${id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        arId = id;
      } else {
        setMessage("💾 Creating AR record...");
        const res = await http.post("/ar/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        arId = res.data?.id;
        if (!arId) {
          throw new Error("Create AR succeeded but no id returned. Ensure serializer includes id.");
        }
      }

      // 3) Finalize: save R2 keys into FileFields (no upload through Django)
      if (glbKey) {
        setMessage("🔗 Linking GLB to AR record...");
        await finalizeBigFile(arId, "glb", glbKey);
      }

      if (apkKey) {
        setMessage("🔗 Linking APK to AR record...");
        await finalizeBigFile(arId, "apk", apkKey);
      }

      setMessage(id ? "✅ AR experience updated successfully!" : "✅ AR experience created successfully!");
      setTimeout(() => navigate("/admin/ar-management"), 1200);
    } catch (err) {
      console.error("Failed to save AR:", err);
      setMessage(`❌ Failed to save AR experience. ${err?.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Loading UI -------------------- */
  if (fetching)
    return (
      <div className="min-h-screen bg-[#0c1a3a] text-white flex items-center justify-center">
        <p>Loading AR experience data…</p>
      </div>
    );

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-6">
        <PageHeader
          title={id ? "Edit AR Experience" : "Create AR Experience"}
          onBack={goBack}
        />

        <div className="max-w-2xl bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/10 mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product */}
            <div>
              <label className="block font-semibold mb-2">Product</label>
              <select
                name="product"
                value={form.product}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-[#16244a] text-white border border-white/20 focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
              >
                <option className="bg-[#16244a] text-white" value="">
                  Select a product
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* AR Type */}
            <div>
              <label className="block font-semibold mb-2">AR Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-[#16244a] text-white border border-white/20 focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
              >
                <option value="MARKER">Marker-based</option>
                <option value="MARKERLESS">Markerless</option>
              </select>
            </div>

            {/* APK Upload */}
            <div>
              <label className="block font-semibold mb-2">App Download (.apk)</label>

              {typeof form.app_download_file === "string" && form.app_download_file && (
                <div className="relative mb-3 flex items-center gap-3">
                  <a
                    href={form.app_download_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    Download current APK
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "apk" })}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-md px-2 py-1 text-sm"
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
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
              />
              <p className="text-xs opacity-70 mt-2">
                Note: APK uploads go directly to R2 (faster, avoids backend timeouts).
              </p>
            </div>

            {/* Marker Image */}
            <div>
              <label className="block font-semibold mb-2">Marker Image</label>
              {typeof form.marker_image === "string" && form.marker_image && (
                <div className="relative w-32 h-32 mb-3">
                  <img
                    src={form.marker_image}
                    alt="Marker"
                    className="w-full h-full object-cover rounded-lg border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "marker" })}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md"
                    title="Delete marker image"
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                name="marker_image"
                accept="image/*"
                onChange={handleChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
              />
            </div>

            {/* GLB Upload */}
            <div>
              <label className="block font-semibold mb-2">3D Model (.glb)</label>
              {typeof form.model_glb === "string" && form.model_glb && (
                <div className="relative mb-3 flex items-center gap-3">
                  <a
                    href={form.model_glb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    View current model
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "glb" })}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-md px-2 py-1 text-sm"
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
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
              />
              <p className="text-xs opacity-70 mt-2">
                Note: GLB uploads go directly to R2 (faster, avoids backend timeouts).
              </p>
            </div>

            {/* MindAR Target (.mind) */}
            <div>
              <label className="block font-semibold mb-2">MindAR Target (.mind)</label>
              {typeof form.marker_mind === "string" && form.marker_mind && (
                <div className="relative mb-3 flex items-center gap-3">
                  <a
                    href={form.marker_mind}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline"
                  >
                    Download current file
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "mind" })}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-md px-2 py-1 text-sm"
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
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
              />
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={form.enabled}
                onChange={handleChange}
                className="w-5 h-5 accent-sky-500"
              />
              <label htmlFor="enabled" className="font-semibold">
                Enabled
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition text-white ${
                loading ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? "Saving..." : id ? "Update AR" : "Create AR"}
            </button>

            {/* Status Message */}
            {message && <p className="text-center text-sm mt-4 opacity-80">{message}</p>}
          </form>
        </div>

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#1e293b] text-white p-6 rounded-xl max-w-sm w-full">
              <h2 className="text-lg font-bold mb-3">Delete File</h2>
              <p className="mb-6">
                Are you sure you want to delete this{" "}
                {confirmDelete.type === "marker"
                  ? "marker image"
                  : confirmDelete.type === "glb"
                  ? "3D model (.glb)"
                  : confirmDelete.type === "apk"
                  ? "APK file"
                  : "MindAR target (.mind)"}{" "}
                file? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    confirmDelete.type === "marker"
                      ? handleDeleteMarker
                      : confirmDelete.type === "glb"
                      ? handleDeleteGLB
                      : confirmDelete.type === "apk"
                      ? handleDeleteApk
                      : handleDeleteMind
                  }
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
