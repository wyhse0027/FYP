import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const AFRAME_SRC = "https://aframe.io/releases/1.5.0/aframe.min.js";
const MINDAR_SRC =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.3/dist/mindar-image-aframe.prod.js";

// CRA env var (set locally in .env, set on Vercel/Koyeb dashboard in production)
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
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);
  const [fatal, setFatal] = useState("");

  // prevent double init/cleanup loops
  const cleanedRef = useRef(false);
  const startedRef = useRef(false);

  // ---- HARD FAIL if env missing (so you don't "load forever") ----
  useEffect(() => {
    if (!BACKEND_BASE) {
      setFatal(
        "Missing REACT_APP_API_BASE_URL. Set it in your deployment environment variables (Vercel/Koyeb) and redeploy."
      );
      console.error(
        "❌ Missing REACT_APP_API_BASE_URL. Example: https://your-backend.koyeb.app"
      );
    } else {
      console.log("🌐 BACKEND_BASE =", BACKEND_BASE);
    }
  }, [BACKEND_BASE]);

  // ---- Teardown: stop MindAR camera + all video tracks ----
  const teardownAR = async () => {
    if (cleanedRef.current) return;
    cleanedRef.current = true;

    try {
      const scene = document.querySelector("a-scene");
      const mindSys = scene?.systems?.["mindar-image"];

      // stop MindAR (important)
      if (mindSys) {
        try {
          await mindSys.stop();
          console.log("🛑 [MINDAR] stopped");
        } catch (e) {
          console.warn("⚠️ [MINDAR] stop error:", e);
        }
      }

      // stop all tracks (MindAR + any preview video)
      document.querySelectorAll("video").forEach((v) => {
        try {
          if (v.srcObject) {
            v.srcObject.getTracks().forEach((t) => t.stop());
            v.srcObject = null;
          }
          v.pause?.();
        } catch {}
      });

      // ✅ DO NOT remove scene / video elements here
      // React will unmount and remove them safely.
    } finally {
      setTimeout(() => {
        cleanedRef.current = false;
        startedRef.current = false;
      }, 300);
    }
  };

  const handleBack = async () => {
    await teardownAR();
    window.history.back();
  };

  // cleanup on route change/unmount
  useEffect(() => {
    return () => {
      teardownAR();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load scripts once ----
  useEffect(() => {
    const loadScripts = async () => {
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
          }, 150);
        });

        if (!window.MINDAR) await loadScript("mindar", MINDAR_SRC);

        console.log("✅ [LOAD] AFRAME + MINDAR ready");
        setReady(true);
      } catch (err) {
        console.error("❌ [LOAD] Script load failed:", err);
        setFatal("Failed to load AR scripts. Check network / CDN availability.");
      }
    };

    loadScripts();
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

  // ---- Validate .mind file (optional safety) ----
  useEffect(() => {
    if (!ready || !data?.marker_mind) return;

    const validateMindFile = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);

        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // ZIP signature PK..
        const isZip =
          bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

        if (isZip) {
          console.error("⚠️ [AR] Invalid .mind file — ZIP detected.");
          setFatal("Invalid .mind file (ZIP). Recompile using MindAR compiler.");
          return false;
        }

        console.log(`✅ [AR] .mind file valid (${bytes.length} bytes)`);
        return true;
      } catch (err) {
        console.error("❌ [AR] Mind file validation failed:", err);
        setFatal("Mind file cannot be loaded. Check storage URL and permissions.");
        return false;
      }
    };

    validateMindFile(data.marker_mind);
  }, [ready, data]);

  // ---- Start MindAR once scene is loaded ----
  useEffect(() => {
    if (!ready || !data || fatal) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const startMindAR = async () => {
      console.log("🎬 [INIT] Starting MindAR...");

      // Wait for <a-scene> to exist
      const scene = document.querySelector("a-scene");
      if (!scene) {
        startedRef.current = false;
        setTimeout(startMindAR, 300);
        return;
      }

      scene.addEventListener("arReady", () => {
        console.log("🟢 [MINDAR] Engine ready — waiting for marker...");
      });

      scene.addEventListener("loaded", () => {
        const mindSys = scene.systems?.["mindar-image"];
        if (mindSys) {
          console.log("🚀 [MINDAR] System found — starting tracking...");
          setTimeout(() => {
            try {
              mindSys.start();
              console.log("🟢 [MINDAR] Tracking started successfully.");
            } catch (err) {
              console.error("💥 [MINDAR] Start failed:", err);
              setFatal("MindAR failed to start. Check HTTPS + camera permission.");
            }
          }, 600);
        }

        const anchor = document.querySelector("#ar-anchor");
        const modelEl = document.querySelector("#ar-model");
        if (anchor) anchor.object3D.visible = false;

        const attachAnimations = (mesh) => {
          if (!mesh || !modelEl) return;
          const anims = mesh.animations || [];
          if (anims.length > 0) {
            console.log(
              `🎥 [MODEL] ${anims.length} animation(s):`,
              anims.map((a) => `${a.name || "clip"} (${a.duration?.toFixed?.(2) ?? "?"}s)`)
            );
            modelEl.setAttribute(
              "animation-mixer",
              "clip: *; loop: repeat; crossFadeDuration: 0.5; timeScale: 1"
            );
            console.log("✅ [ANIM] Mixer attached.");
          } else {
            console.warn("⚠️ [MODEL] No animations found.");
          }
        };

        if (modelEl) {
          modelEl.addEventListener("model-loaded", (e) => {
            const mesh = e.detail.model;
            console.log("🧩 [MODEL] Loaded");
            attachAnimations(mesh);
          });
        }

        const target = document.querySelector("[mindar-image-target]");
        if (target) {
          target.addEventListener("targetFound", () => {
            console.log("🎯 [MARKER] FOUND ✅");
            if (anchor) anchor.object3D.visible = true;

            const mesh = modelEl?.getObject3D("mesh");
            if (mesh) attachAnimations(mesh);

            setShowInstruction(false);
          });

          target.addEventListener("targetLost", () => {
            console.log("🚫 [MARKER] LOST ❌");
            if (anchor) anchor.object3D.visible = false;
            if (modelEl) modelEl.removeAttribute("animation-mixer");
            setShowInstruction(true);
          });
        }
      });
    };

    startMindAR();
  }, [ready, data, fatal]);

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
            Check: Vercel env var → REACT_APP_API_BASE_URL, backend reachable, CORS allowed.
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
        // ✅ fixed autoStart
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 36, height: 36 }}
        >
          <polyline points="19 12 5 12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

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

      {/* Optional: instruction overlay (you had showInstruction state but not rendering it) */}
      {showInstruction && (
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
