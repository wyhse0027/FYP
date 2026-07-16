// src/pages/admin/AdminARManagement.js
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../../lib/http";
import { useAdminChrome } from "../../context/AdminChromeContext";
import {
  AdminConfirm,
  AdminToast,
  DataTable,
  StatusPill,
} from "../../components/admin";

const COLUMNS = [
  { label: "#" },
  { label: "Product" },
  { label: "Type" },
  { label: "Marker", align: "right" },
  { label: "3D Model", align: "right" },
  { label: "MindAR Target", align: "right" },
  { label: "App Download" },
  { label: "Enabled", align: "right" },
  { label: "Actions", align: "right" },
];

const addARAction = (
  <Link
    to="/admin/ar-management/new"
    className="btn-lux px-6 py-3 rounded-full text-[11px] font-medium label uppercase"
  >
    Add AR
  </Link>
);

export default function AdminARManagement() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useAdminChrome({ title: "AR Experiences", actions: addARAction, backTo: "/admin/dashboard" });

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

  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-2">
      <DataTable
        columns={COLUMNS}
        loading={loading}
        isEmpty={!loading && experiences.length === 0}
        empty="No AR experiences found."
        minWidth={1120}
      >
        {experiences.map((exp, i) => (
          <tr key={exp.id} className="row">
            <td className="px-6 py-4 text-luxury-mut">#{i + 1}</td>
            <td className="px-6 py-4 text-luxury-text">{exp.product?.name || "—"}</td>
            <td className="px-6 py-4 text-luxury-mut">{exp.type}</td>
            <td className="px-6 py-4 text-right">
              <StatusPill status={exp.marker_image_url ? "SUCCESS" : "FAILED"} label={exp.marker_image_url ? "Ready" : "Missing"} />
            </td>
            <td className="px-6 py-4 text-right">
              <StatusPill status={exp.model_glb_url ? "SUCCESS" : "FAILED"} label={exp.model_glb_url ? "Ready" : "Missing"} />
            </td>
            <td className="px-6 py-4 text-right">
              <StatusPill status={exp.marker_mind_url ? "SUCCESS" : "FAILED"} label={exp.marker_mind_url ? "Ready" : "Missing"} />
            </td>
            <td className="px-6 py-4">
              {exp.app_download_file_url ? (
                <a
                  href={exp.app_download_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-luxury-gold2 hover:text-luxury-champagne"
                >
                  Download
                </a>
              ) : (
                <span className="text-luxury-mut italic">N/A</span>
              )}
            </td>
            <td className="px-6 py-4 text-right">
              <button
                onClick={() => toggleEnabled(exp.id, exp.enabled)}
                className={`rounded-full px-3 py-1.5 text-[11px] border ${
                  exp.enabled
                    ? "border-luxury-gold/50 text-luxury-gold2 hover:bg-luxury-gold/10"
                    : "border-luxury-mut/40 text-luxury-mut hover:bg-luxury-panel2"
                }`}
              >
                {exp.enabled ? "Enabled" : "Disabled"}
              </button>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/admin/ar-management/${exp.id}/edit`}
                  className="ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setConfirmDelete(exp)}
                  className="border border-red-500/50 text-red-300 hover:bg-red-500/10 rounded-full px-3 py-1.5 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {confirmDelete && (
        <AdminConfirm
          open
          title="Confirm Deletion"
          message={`Are you sure you want to delete the AR experience for ${confirmDelete.product?.name || "this product"}?`}
          confirmText="Confirm"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
