import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const AFRAME_SRC = "https://aframe.io/releases/1.5.0/aframe.min.js";
const MINDAR_SRC =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.3/dist/mindar-image-aframe.prod.js";
const BACKEND_BASE = "http://127.0.0.1:8000";

function toAbsolute(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND_BASE}/${url.replace(/^\/+/, "")}`;
}

// ✅ Ask for camera permission
const ensureCameraStream = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("📸 Camera permission granted");
    return stream;
  } catch (err) {
    console.error("🚫 Camera permission denied:", err);
    alert("Please allow camera access to view AR content.");
    return null;
  }
};

export default function ARViewer() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);

  // ─────────────── Handle Back Button ───────────────
  const handleBack = () => {
    const video = document.getElementById("camera-preview");
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }

    const overlay = document.getElementById("camera-preview");
    if (overlay) {
      overlay.pause?.();
      overlay.remove();
    }

    const scene = document.querySelector("a-scene");
    if (scene) {
      scene.pause();
      scene.parentNode?.removeChild(scene);
    }

    window.history.back();
  };

  // ─────────────── Load AFRAME + MINDAR ───────────────
  useEffect(() => {
    const loadScripts = async () => {
      console.log("📦 [LOAD] Initializing AFRAME + MINDAR...");
      const loadScript = (id, src) =>
        new Promise((resolve, reject) => {
          if (document.getElementById(id)) return resolve();
          const s = document.createElement("script");
          s.src = src;
          s.id = id;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });

      if (!window.AFRAME) await loadScript("aframe", AFRAME_SRC);
      await new Promise((r) => {
        const check = setInterval(() => {
          if (window.AFRAME?.THREE) {
            clearInterval(check);
            window.THREE = window.AFRAME.THREE;
            r();
          }
        }, 200);
      });

      if (!window.MINDAR) await loadScript("mindar", MINDAR_SRC);
      console.log("✅ [LOAD] AFRAME + MINDAR ready");
      setReady(true);
    };

    loadScripts().catch((err) =>
      console.error("❌ [LOAD] Script load failed:", err)
    );
  }, []);

  // ─────────────── Fetch AR data ───────────────
  useEffect(() => {
    if (!slug) return;
    console.log("🌍 [AR] Fetching AR data for:", slug);

    fetch(`${BACKEND_BASE}/api/ar/?product__name=${slug.replace(/-/g, " ")}`)
      .then((r) => r.json())
      .then((j) => {
        const r = (Array.isArray(j) && j[0]) || (j.results && j.results[0]);
        if (r) {
          r.marker_mind = toAbsolute(r.marker_mind);
          r.model_glb = toAbsolute(r.model_glb);
          setData(r);
          console.log("✅ [AR] Loaded marker + model:", r);
        } else console.warn("⚠️ [AR] No AR data found");
      })
      .catch((e) => console.error("❌ [AR] Fetch failed:", e));
  }, [slug]);

  // ─────────────── Validate .mind file ───────────────
  useEffect(() => {
    if (!ready || !data) return;

    const validateMindFile = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        const isZip =
          bytes[0] === 0x50 &&
          bytes[1] === 0x4b &&
          bytes[2] === 0x03 &&
          bytes[3] === 0x04;

        if (isZip) {
          console.error("⚠️ [AR] Invalid .mind file — ZIP detected.");
          alert("Invalid .mind file — recompile with MindAR compiler.");
          return false;
        }

        console.log(`✅ [AR] .mind file valid (${bytes.length} bytes)`);
        return true;
      } catch (err) {
        console.error("❌ [AR] Mind file validation failed:", err);
        return false;
      }
    };

    validateMindFile(data.marker_mind);
  }, [ready, data]);

  // ─────────────── Initialize MindAR + Animate GLB ───────────────
  useEffect(() => {
    if (!ready || !data) return;

    const startMindAR = async () => {
      console.log("🎬 [INIT] Starting MindAR setup...");
      const stream = await ensureCameraStream();
      if (!stream) return;

      let preview = document.getElementById("camera-preview");
      if (!preview) {
        preview = document.createElement("video");
        preview.id = "camera-preview";
        preview.autoplay = true;
        preview.playsInline = true;
        preview.muted = true;
        preview.style.cssText = `
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          object-fit: cover;
          z-index: 0;
          background: #000;
        `;
        document.body.appendChild(preview);
      }
      preview.srcObject = stream;

      const scene = document.querySelector("a-scene");
      if (!scene) {
        console.log("⏳ Waiting for <a-scene>...");
        setTimeout(startMindAR, 500);
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
            }
          }, 800);
        }

        const anchor = document.querySelector("#ar-anchor");
        const model = document.querySelector("#ar-model");
        if (anchor) anchor.object3D.visible = false;

        // ✅ Add explicit GLTF animation handling
        const attachAnimations = (mesh) => {
          if (!mesh) return;
          if (mesh.animations && mesh.animations.length > 0) {
            console.log(
              `🎥 [MODEL] ${mesh.animations.length} animation(s):`,
              mesh.animations.map((a) => `${a.name} (${a.duration.toFixed(2)}s)`)
            );
            model.setAttribute(
              "animation-mixer",
              "clip: *; loop: repeat; crossFadeDuration: 0.5; timeScale: 1"
            );
            console.log("✅ [ANIM] Mixer attached to model.");
          } else {
            console.warn("⚠️ [MODEL] No animations on mesh:", mesh);
          }
        };

        if (model) {
          model.addEventListener("model-loaded", (e) => {
            const mesh = e.detail.model;
            console.log("🧩 [MODEL] Loaded:", mesh);
            attachAnimations(mesh);
          });
        }

        const target = document.querySelector("[mindar-image-target]");
        if (target) {
          target.addEventListener("targetFound", () => {
            console.log("🎯 [MARKER] FOUND ✅");
            if (anchor) anchor.object3D.visible = true;

            const mesh = model?.getObject3D("mesh");
            if (mesh) {
              attachAnimations(mesh);
              console.log("▶️ [ANIM] Playing all clips...");
            }

            setShowInstruction(false);
          });

          target.addEventListener("targetLost", () => {
            console.log("🚫 [MARKER] LOST ❌ — stopping animation");
            if (anchor) anchor.object3D.visible = false;
            if (model) {
              model.removeAttribute("animation-mixer");
              console.log("⏹ [ANIM] Mixer removed.");
            }
            setShowInstruction(true);
          });
        }
      });
    };

    startMindAR();
  }, [ready, data]);

  // ─────────────── Render Scene ───────────────
  if (!ready || !data)
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

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <a-scene
        mindar-image={`imageTargetSrc: ${data.marker_mind}; autoStart: ; uiScanning: true;`}
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: true"
        embedded
      >
        <a-camera position="0 0 0" look-controls="enabled: false" mindar-camera></a-camera>

        <a-light type="ambient" intensity="2"></a-light>
        <a-light type="directional" position="0 1 1" intensity="2"></a-light>

        <a-entity id="ar-anchor" mindar-image-target="targetIndex: 0">
          <a-gltf-model
            id="ar-model"
            src={data.model_glb}
            scale="0.75 0.75 0.75"
            rotation="-90 180 0"
          ></a-gltf-model>
        </a-entity>
      </a-scene>

      {/* ✅ Elegant Back Button */}
      <button
        onClick={handleBack}
        style={{
          position: "fixed",
          top: "24px",
          left: "24px",
          zIndex: 9999,
          background: "rgba(15, 25, 50, 0.7)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "14px",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
          transition: "all 0.3s ease",
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
          style={{ width: "36px", height: "36px" }}
        >
          <polyline points="19 12 5 12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <style>{`
        video, #camera-preview {
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
        @keyframes floatBack {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        button svg {
          animation: floatBack 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
