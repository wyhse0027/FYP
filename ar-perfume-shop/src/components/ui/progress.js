// src/components/ui/progress.jsx
import React from "react";

export function Progress({ value = 0, className = "" }) {
  const safe = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-yellow-400 transition-all duration-300"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
