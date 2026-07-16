import React from "react";

export default function DataTable({
  columns = [],
  loading = false,
  isEmpty = false,
  empty = null,
  children,
  minWidth = 720,
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="label uppercase text-[10px] text-luxury-mut border-b border-white/10">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-6 py-4 font-normal ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8">
                  <div className="skel h-24 rounded-xl" />
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-luxury-mut text-sm">
                  {empty}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
