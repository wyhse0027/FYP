// src/lib/http.js
import axios from "axios";
import BASE_URL from "../config/api";

const http = axios.create({
  baseURL: BASE_URL, // e.g. http://127.0.0.1:8000/api/
  withCredentials: false,
});

const getAccess = () => localStorage.getItem("access");
const getRefresh = () => localStorage.getItem("refresh");

// 🧠 Attach access token to all requests
http.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🧠 Handle expired tokens
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // If 401 → try refresh (only once)
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefresh();

      if (!refresh) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}token/refresh/`, { refresh });
        localStorage.setItem("access", data.access);

        // retry previous request
        original.headers.Authorization = `Bearer ${data.access}`;
        return http(original);
      } catch (refreshErr) {
        // Refresh token invalid → logout
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default http;
