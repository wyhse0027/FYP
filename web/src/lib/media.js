import http from "./http";

// Build full media URL from backend
export const getImageUrl = (path) => {
  if (!path) return "/placeholder.png";
  // Ensure backend host is correct (remove /api/)
  const base = http.defaults.baseURL.replace("/api/", "");
  // Prevent accidental double slashes
  return `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");
};
