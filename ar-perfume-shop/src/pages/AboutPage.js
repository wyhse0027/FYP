import React, { useEffect, useState } from "react";
import http from "../lib/http";
import PageHeader from "../components/PageHeader";

const loadFont = () => {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Open+Sans:wght@400;600&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

export default function AboutPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    loadFont();
    const fetchAbout = async () => {
      try {
        const res = await http.get("/site/about/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          const about = res.data[0];

          // ✅ Parse social_icons if string
          if (typeof about.social_icons === "string") {
            try {
              about.social_icons = JSON.parse(about.social_icons);
            } catch {
              about.social_icons = {};
            }
          }

          setData(about);
        } else {
          setError("No about information found.");
        }
      } catch (err) {
        console.error("Failed to fetch About info:", err);
        setError("Failed to load content.");
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-2xl">
        <p>Loading About page...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-2xl">
        <p>{error}</p>
      </div>
    );

  const fixURL = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://127.0.0.1:8000${url}`;
  };

  return (
    <div
      className="min-h-screen bg-[#0c1a3a] text-white"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
    >
      {/* ─── Hero Section ───────────────────────────── */}
      {data?.hero_image_url && (
        <div className="w-full bg-black">
          <img
            src={data.hero_image_url}
            alt="About banner"
            className="w-full h-auto max-h-[80vh] object-contain md:object-cover"
          />
        </div>
      )}

      {/* ─── Main Story Section ─────────────────────── */}
      <section className="w-full px-6 md:px-20 lg:px-32 py-20">
        <div className="max-w-7xl mx-auto mb-8">
          <PageHeader title="" />
        </div>

        <h1
          className="text-center text-5xl md:text-7xl font-bold mb-10"
          style={{
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "1px",
          }}
        >
          {data?.title || "About GERAIN CHAN"}
        </h1>

        <div className="max-w-7xl mx-auto space-y-10 text-white/90 text-2xl md:text-3xl leading-relaxed">
          {data?.intro_text && <p>{data.intro_text}</p>}
          {data?.body_text && (
            <p className="whitespace-pre-line">{data.body_text}</p>
          )}
        </div>
      </section>

      {/* ─── Interactive Info Section ───────────────── */}
      <section className="max-w-7xl mx-auto px-10 md:px-16 lg:px-24 pb-28 grid md:grid-cols-2 gap-14">
        {/* Mission */}
        {data?.mission && (
          <div
            onMouseEnter={() => setHovered("mission")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold text-5xl md:text-6xl cursor-pointer transition-colors duration-300 ${
                hovered === "mission" ? "text-white" : "text-white/50"
              }`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Mission
            </h3>
            <div
              className={`mt-6 text-white/80 text-2xl transition-all duration-500 overflow-hidden ${
                hovered === "mission"
                  ? "max-h-[400px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p>{data.mission}</p>
            </div>
          </div>
        )}

        {/* Vision */}
        {data?.vision && (
          <div
            onMouseEnter={() => setHovered("vision")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold text-5xl md:text-6xl cursor-pointer transition-colors duration-300 ${
                hovered === "vision" ? "text-white" : "text-white/50"
              }`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Vision
            </h3>
            <div
              className={`mt-6 text-white/80 text-2xl transition-all duration-500 overflow-hidden ${
                hovered === "vision"
                  ? "max-h-[400px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p>{data.vision}</p>
            </div>
          </div>
        )}

        {/* Contact */}
        {(data?.contact_email || data?.contact_phone || data?.address) && (
          <div
            onMouseEnter={() => setHovered("contact")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold text-5xl md:text-6xl cursor-pointer transition-colors duration-300 ${
                hovered === "contact" ? "text-white" : "text-white/50"
              }`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Contact Us
            </h3>
            <div
              className={`mt-6 text-white/80 text-2xl transition-all duration-500 overflow-hidden ${
                hovered === "contact"
                  ? "max-h-[400px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-4">
                {data.contact_email && (
                  <p>
                    📧{" "}
                    <a
                      href={`mailto:${data.contact_email}`}
                      className="underline hover:text-white"
                    >
                      {data.contact_email}
                    </a>
                  </p>
                )}
                {data.contact_phone && <p>📞 {data.contact_phone}</p>}
                {data.address && <p>📍 {data.address}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── Social Links (Minimal Fade Style) ───────────────── */}
        {data?.social_links &&
          Object.keys(data.social_links).length > 0 && (
            <div
              onMouseEnter={() => setHovered("social")}
              onMouseLeave={() => setHovered(null)}
              className="relative group"
            >
              <h3
                className={`font-bold text-5xl md:text-6xl cursor-pointer transition-colors duration-300 ${
                  hovered === "social" ? "text-white" : "text-white/50"
                }`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Follow Us
              </h3>

              <div
                className={`mt-6 text-white/80 text-2xl transition-all duration-500 overflow-hidden ${
                  hovered === "social"
                    ? "max-h-[400px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex gap-6 flex-wrap items-center">
                  {Object.entries(data.social_links).map(([key, value]) => {
                    const icon = data.social_icons?.[key];
                    return (
                    <a
                      key={key}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={key}
                      className="w-20 h-20 rounded-full flex items-center justify-center
                                bg-[#101f46] hover:bg-[#162a5e]
                                transition-colors duration-300"
                    >
                      {icon ? (
                        <img
                          src={fixURL(icon)}
                          alt={key}
                          className="w-14 h-14 object-contain rounded-full opacity-90 hover:opacity-60 transition-opacity duration-300"
                        />
                      ) : (
                        <span className="capitalize text-sm text-white/70 hover:text-white/50 transition-colors duration-300">
                          {key}
                        </span>
                      )}
                    </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
      </section>

      {/* ─── Footer Accent ─────────────────────────── */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto max-w-4xl" />
      <p className="text-center text-white/50 text-lg py-8 tracking-wide">
        © {new Date().getFullYear()} GERAIN CHAN — Crafted with emotion, art &
        technology.
      </p>
    </div>
  );
}
