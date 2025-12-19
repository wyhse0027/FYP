// src/lib/http.js
import axios from "axios";

// ✅ CRA reads env from process.env.REACT_APP_*
const ROOT = process.env.REACT_APP_API_BASE_URL;

if (!ROOT) {
  throw new Error(
    "Missing REACT_APP_API_BASE_URL. Set it in .env.development and Vercel env vars."
  );
}

// Normalize trailing slash
const BASE_URL = ROOT.replace(/\/+$/, "") + "/";

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // JWT via Authorization header
});

// Token helpers
const getAccess = () => localStorage.getItem("access");
const getRefresh = () => localStorage.getItem("refresh");

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

// Attach access token
http.interceptors.request.use(
  (config) => {
    const token = getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Refresh token on 401 (once)
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const refresh = getRefresh();
      if (!refresh) {
        logout();
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post(
          `${BASE_URL}token/refresh/`,
          { refresh }
        );

        if (!data?.access) {
          logout();
          return Promise.reject(err);
        }

        localStorage.setItem("access", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return http(original);
      } catch (refreshErr) {
        logout();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default http;
export { BASE_URL };
