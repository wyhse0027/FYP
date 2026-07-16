import React from "react";

const BUCKET = {
  TO_PAY: "progress",
  TO_SHIP: "progress",
  TO_RECEIVE: "progress",
  TO_RATE: "progress",
  PENDING: "progress",
  COMPLETED: "positive",
  SUCCESS: "positive",
  CANCELLED: "negative",
  FAILED: "negative",
};

const CLS = {
  progress: "border border-luxury-gold/50 text-luxury-gold2",
  positive: "bg-luxury-champagne text-luxury-bg font-semibold",
  neutral: "border border-luxury-mut/40 text-luxury-mut",
  negative: "border border-red-500/50 text-red-300",
};

export function bucketOf(status) {
  return BUCKET[status] || "neutral";
}

export default function StatusPill({ status, label }) {
  const b = bucketOf(status);
  const text = label || String(status || "").replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] tracking-wide ${CLS[b]}`}>
      {text}
    </span>
  );
}
