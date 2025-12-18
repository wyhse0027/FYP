// src/pages/admin/AdminARManagement.js
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import http from "../../lib/http";
import PageHeader from "../../components/PageHeader";
import { IoClose, IoAlertCircle, IoCheckmarkCircle } from "react-icons/io5";

// ─────────────────────────────────────────────
// Toast (bottom-right)
// ─────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const color =
    type === "error"
      ? "bg-red-600/90 border-red-400"
      : "bg-green-600/90 border-green-400";

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-white ${color}`}
    >
      {type === "error" ? (
        <IoAlertCircle size={22} />
      ) : (
        <IoCheckmarkCircle size={22} />
      )}
      <p className="font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-3 opacity-80 hover:opacity-100"
      >
        <IoClose size={18} />
      </button>
    </div>
  );
}

export default function AdminARManagement() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // ─── Fetch all AR experiences ────────────────────────
  async function fetchAR() {
    try {
      const res = await http.get("/ar/");
      setExperiences(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load AR experiences:", err);
      setError("Failed to load AR experiences.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAR();
  }, []);

  // ─── Toggle Enabled ─────────────────────────────────
  async function toggleEnabled(id, currentState) {
    try {
      await http.patch(`/ar/${id}/`, { enabled: !currentState });
      setExperiences((prev) =>
        prev.map((exp) =>
          exp.id === id ? { ...exp, enabled: !currentState } : exp
        )
      );
      setToast({
        type: "success",
        message: `AR experience ${!currentState ? "enabled" : "disabled"} successfully.`,
      });
    } catch (err) {
      console.error("Failed to update AR state:", err);
      setToast({
        type: "error",
        message: "Failed to update AR experience state.",
      });
    }
  }

  // ─── Delete AR Experience ────────────────────────────
  async function handleDelete(id) {
    try {
      await http.delete(`/ar/${id}/`);
      setConfirmDelete(null);
      setToast({
        type: "success",
        message: "AR experience deleted successfully.",
      });
      fetchAR();
    } catch (err) {
      console.error("Failed to delete AR experience:", err);
      setToast({
        type: "error",
        message: "Failed to delete AR experience.",
      });
    }
  }

  // ─── UI Rendering ───────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen bg-[#0c1a3a] text-white flex items-center justify-center">
        <p>Loading AR experiences…</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[#0c1a3a] text-white flex items-center justify-center">
        <p>{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0c1a3a] text-white px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto py-8">
        <PageHeader title="AR Experience Management" />

        <Link
          to="/admin/ar-management/new"
          className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
        >
          + Add New AR
        </Link>

        {experiences.length === 0 ? (
          <div className="text-center text-gray-300 py-20">
            <p>No AR experiences found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left border border-white/10 rounded-lg overflow-hidden">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Marker</th>
                  <th className="px-4 py-3 text-center">3D Model</th>
                  <th className="px-4 py-3 text-center">MindAR Target</th>
                  <th className="px-4 py-3">App Download (APK)</th>
                  <th className="px-4 py-3 text-center">Enabled</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {experiences.map((exp, i) => (
                  <tr
                    key={exp.id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">{exp.product?.name || "—"}</td>
                    <td className="px-4 py-3">{exp.type}</td>

                    {/* Marker */}
                    <td className="px-4 py-3 text-center">
                      {exp.marker_image_url ? "✔️" : "❌"}
                    </td>

                    {/* 3D Model */}
                    <td className="px-4 py-3 text-center">
                      {exp.model_glb_url ? "✔️" : "❌"}
                    </td>

                    {/* MindAR */}
                    <td className="px-4 py-3 text-center">
                      {exp.marker_mind_url ? "✔️" : "❌"}
                    </td>

                    {/* App Download (APK) */}
                    <td className="px-4 py-3">
                      {exp.app_download_file_url ? (
                        <a
                          href={exp.app_download_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>

                    {/* Enabled toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleEnabled(exp.id, exp.enabled)}
                        className={`px-3 py-1 rounded-lg font-semibold ${
                          exp.enabled
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {exp.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center flex gap-2 justify-center">
                      <Link
                        to={`/admin/ar-management/${exp.id}/edit`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(exp)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#1e293b] p-6 rounded-xl w-full max-w-sm text-white">
              <h2 className="text-lg font-bold mb-3">Confirm Deletion</h2>
              <p className="mb-6">
                Are you sure you want to delete the AR experience for{" "}
                <span className="font-semibold">
                  {confirmDelete.product?.name || "this product"}
                </span>
                ?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
