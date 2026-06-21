// src/pages/ARViewer.jsx (or wherever you keep it)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const AFRAME_SRC = "https://aframe.io/releases/1.5.0/aframe.min.js";
const MINDAR_SRC =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.3/dist/mindar-image-aframe.prod.js";

// CRA env var
const RAW_BACKEND_BASE = process.env.REACT_APP_API_BASE_URL || "";

// Normalize base URL: remove trailing slashes
function normalizeBase(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function apiToOrigin(apiBase) {
  // converts:
  // https://xxx.koyeb.app/api   -> https://xxx.koyeb.app
  // http://127.0.0.1:8000/api  -> http://127.0.0.1:8000
  return (apiBase || "").replace(/\/api\/?$/, "");
}

function toAbsolute(url, apiBase) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const origin = apiToOrigin(apiBase);
  return `${origin}/${String(url).replace(/^\/+/, "")}`;
}

export default function ARViewer() {
  const { slug } = useParams();

  const BACKEND_BASE = useMemo(() => normalizeBase(RAW_BACKEND_BASE), []);

  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);

  const [fatal, setFatal] = useState("");
  const [showInstruction, setShowInstruction] = useState(true);

  // user gesture start
  const [needsStart, setNeedsStart] = useState(true);
  const [starting, setStarting] = useState(false);

  const sceneRef = useRef(null);
  const loadedOnceRef = useRef(false);

  // ---- HARD FAIL if env missing ----
  useEffect(() => {
    if (!BACKEND_BASE) {
      setFatal(
        "Missing REACT_APP_API_BASE_URL. Set it in Vercel environment variables and redeploy."
      );
      console.error("❌ Missing REACT_APP_API_BASE_URL");
    } else {
      console.log("🌐 BACKEND_BASE =", BACKEND_BASE);
    }
  }, [BACKEND_BASE]);

  // ---- Load scripts once ----
  useEffect(() => {
    let cancelled = false;

    const loadScript = (id, src) =>
      new Promise((resolve, reject) => {
        if (document.getElementById(id)) return resolve();
        const s = document.createElement("script");
        s.src = src;
        s.id = id;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

    const run = async () => {
      try {
        console.log("📦 [LOAD] Loading AFRAME + MINDAR...");

        if (!window.AFRAME) await loadScript("aframe", AFRAME_SRC);

        // wait for AFRAME.THREE
        await new Promise((r) => {
          const t = setInterval(() => {
            if (window.AFRAME?.THREE) {
              clearInterval(t);
              window.THREE = window.AFRAME.THREE;
              r();
            }
          }, 100);
        });

        if (!window.MINDAR) await loadScript("mindar", MINDAR_SRC);

        console.log("✅ [LOAD] AFRAME + MINDAR ready");
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("❌ [LOAD] Script load failed:", err);
        if (!cancelled)
          setFatal("Failed to load AR scripts. Check network / CDN availability.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Fetch AR data ----
  useEffect(() => {
    if (!slug || !BACKEND_BASE) return;

    const productName = slug.replace(/-/g, " ");
    const q = encodeURIComponent(productName);

    console.log("🌍 [AR] Fetching AR data for:", productName);

    fetch(`${BACKEND_BASE}/ar/?product__name=${q}`)
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`AR API ${r.status}: ${txt || r.statusText}`);
        }
        return r.json();
      })
      .then((j) => {
        const rec = (Array.isArray(j) && j[0]) || (j?.results && j.results[0]);
        if (!rec) {
          console.warn("⚠️ [AR] No AR data found for:", productName);
          setFatal("No AR data found for this product (backend returned empty).");
          return;
        }

        const marker_mind = toAbsolute(rec.marker_mind, BACKEND_BASE);
        const model_glb = toAbsolute(rec.model_glb, BACKEND_BASE);

        const fixed = { ...rec, marker_mind, model_glb };
        console.log("✅ [AR] Loaded marker + model:", fixed);
        setData(fixed);
      })
      .catch((e) => {
        console.error("❌ [AR] Fetch failed:", e);
        setFatal(
          "Failed to load AR data from backend. Check BACKEND URL, CORS, and /api/ar/ endpoint."
        );
      });
  }, [slug, BACKEND_BASE]);

  // ---- Bind target found/lost after scene loaded ----
  useEffect(() => {
    if (!ready || !data || fatal) return;

    const scene = document.querySelector("a-scene");
    if (!scene) return;

    sceneRef.current = scene;

    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;

    const onArReady = () => console.log("🟢 [MINDAR] arReady fired");
    const onArError = (e) => console.error("🔴 [MINDAR] arError:", e);

    const onLoaded = () => {
      console.log("✅ [SCENE] loaded event");

      const anchor = document.querySelector("#ar-anchor");
      const modelEl = document.querySelector("#ar-model");
      if (anchor) anchor.object3D.visible = false;

      const target = document.querySelector("[mindar-image-target]");
      if (target) {
        target.addEventListener("targetFound", () => {
          console.log("🎯 [MARKER] FOUND ✅");
          if (anchor) anchor.object3D.visible = true;
          setShowInstruction(false);
        });

        target.addEventListener("targetLost", () => {
          console.log("🚫 [MARKER] LOST ❌");
          if (anchor) anchor.object3D.visible = false;
          if (modelEl) modelEl.removeAttribute("animation-mixer");
          setShowInstruction(true);
        });
      }

      if (modelEl) {
        modelEl.addEventListener("model-loaded", () => {
          console.log("🧩 [MODEL] loaded");
        });
      }
    };

    scene.addEventListener("arReady", onArReady);
    scene.addEventListener("arError", onArError);
    scene.addEventListener("loaded", onLoaded);

    return () => {
      scene.removeEventListener("arReady", onArReady);
      scene.removeEventListener("arError", onArError);
      scene.removeEventListener("loaded", onLoaded);
    };
  }, [ready, data, fatal]);

  // ---- Start camera ONLY on user click ----
  const handleStartAR = async () => {
    if (starting) return;
    setStarting(true);

    try {
      const scene = sceneRef.current || document.querySelector("a-scene");
      if (!scene) throw new Error("Scene not found");

      // ✅ correct system name
      const mindSys = scene.systems?.["mindar-image-system"];
      if (!mindSys) throw new Error("mindar-image-system not found");

      console.log("🚀 [MINDAR] starting (user gesture) ...");
      await mindSys.start();

      // show scanning UI & camera
      setNeedsStart(false);
      setShowInstruction(true);

      console.log("🟢 [MINDAR] started");
    } catch (err) {
      console.error("💥 [MINDAR] start failed:", err);
      setFatal(
        "Camera failed to start. Make sure HTTPS is used and camera permission is allowed."
      );
    } finally {
      setStarting(false);
    }
  };

  // ---- Stop MindAR + stop camera tracks ----
  const teardownAR = async () => {
    try {
      const scene = sceneRef.current || document.querySelector("a-scene");
      const mindSys = scene?.systems?.["mindar-image-system"]; // ✅ correct

      if (mindSys) {
        try {
          await mindSys.stop();
          console.log("🛑 [MINDAR] stopped");
        } catch (e) {
          console.warn("⚠️ [MINDAR] stop error:", e);
        }
      }

      // stop all media tracks
      document.querySelectorAll("video").forEach((v) => {
        try {
          if (v.srcObject) {
            v.srcObject.getTracks().forEach((t) => t.stop());
            v.srcObject = null;
          }
          v.pause?.();
        } catch {}
      });
    } catch (e) {
      console.warn("⚠️ teardown error:", e);
    } finally {
      setNeedsStart(true);
      setShowInstruction(true);
    }
  };

  const handleBack = async () => {
    await teardownAR();
    window.history.back();
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      teardownAR();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- UI states ----
  if (fatal) {
    return (
      <div
        style={{
          background: "#000",
          height: "100vh",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>AR failed to load</div>
          <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{fatal}</div>
          <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            Check: REACT_APP_API_BASE_URL, backend reachable, camera permission.
          </div>
        </div>

        <button
          onClick={handleBack}
          style={{
            marginTop: 10,
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "12px 18px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    );
  }

  if (!ready || !data) {
    return (
      <div
        style={{
          background: "#000",
          height: "100vh",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        Loading AR Environment...
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <a-scene
        mindar-image={`imageTargetSrc: ${data.marker_mind}; autoStart: false; uiScanning: true; uiError: true;`}
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: true"
        embedded
      >
        <a-camera position="0 0 0" look-controls="enabled: false" mindar-camera />

        <a-light type="ambient" intensity="2" />
        <a-light type="directional" position="0 1 1" intensity="2" />

        <a-entity id="ar-anchor" mindar-image-target="targetIndex: 0">
          <a-gltf-model
            id="ar-model"
            src={data.model_glb}
            scale="0.75 0.75 0.75"
            rotation="-90 180 0"
          />
        </a-entity>
      </a-scene>

      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 9999,
          background: "rgba(15, 25, 50, 0.7)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 14,
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
          backdropFilter: "blur(6px)",
        }}
      >
        ←
      </button>

      {/* START button (required for camera permission on many browsers) */}
      {needsStart && (
        <button
          onClick={handleStartAR}
          disabled={starting}
          style={{
            position: "fixed",
            bottom: 96,               // 👈 above bottom nav
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "14px 22px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: starting ? "not-allowed" : "pointer",
            opacity: starting ? 0.7 : 1,
            backdropFilter: "blur(8px)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
          }}
        >
          {starting ? "Starting camera…" : "Start AR"}
        </button>
      )}

      <style>{`
        video {
          display: block !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          object-fit: cover !important;
          z-index: 0 !important;
          background: #000 !important;
        }
        a-scene, canvas {
          z-index: 2 !important;
          position: relative !important;
        }
      `}</style>

      {showInstruction && !needsStart && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            fontFamily: "system-ui, Arial",
            fontSize: 14,
            backdropFilter: "blur(6px)",
          }}
        >
          Point your camera at the marker to view the AR model.
        </div>
      )}
    </div>
  );
}
