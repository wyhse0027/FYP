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

          // Parse social_icons if string
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
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-lg sm:text-2xl px-4">
        <p>Loading About page...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-lg sm:text-2xl px-4">
        <p>{error}</p>
      </div>
    );

  const fixURL = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://127.0.0.1:8000${url}`;
  };

  // Helper: on mobile, don't rely on hover (touch devices)
  const onEnter = (k) => {
    // only expand on md+ hover, on mobile keep it always visible (we'll handle via CSS)
    setHovered(k);
  };

  return (
    <div
      className="min-h-screen bg-[#0c1a3a] text-white"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
    >
      {/* Hero Section */}
      {data?.hero_image_url && (
        <div className="w-full bg-black">
          <img
            src={data.hero_image_url}
            alt="About banner"
            className="w-full h-auto max-h-[45vh] sm:max-h-[60vh] md:max-h-[80vh] object-cover"
          />
        </div>
      )}

      {/* Main Story Section */}
      <section className="w-full px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 py-10 sm:py-14 md:py-20">
        <div className="max-w-6xl mx-auto mb-5 sm:mb-8">
          <PageHeader title="" />
        </div>

        <h1
          className="text-center font-bold mb-6 sm:mb-8 md:mb-10
                     text-3xl sm:text-4xl md:text-6xl lg:text-7xl"
          style={{
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.5px",
          }}
        >
          {data?.title || "About GERAIN CHAN"}
        </h1>

        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-7 md:space-y-10 text-white/90 leading-relaxed
                        text-base sm:text-lg md:text-2xl">
          {data?.intro_text && <p>{data.intro_text}</p>}
          {data?.body_text && <p className="whitespace-pre-line">{data.body_text}</p>}
        </div>
      </section>

      {/* Interactive Info Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-16 lg:px-24 pb-14 sm:pb-20 md:pb-28 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-14">
        {/* Mission */}
        {data?.mission && (
          <div
            onMouseEnter={() => onEnter("mission")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold cursor-pointer transition-colors duration-300
                          text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                          ${hovered === "mission" ? "text-white" : "text-white/70 md:text-white/50"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Mission
            </h3>

            {/* Mobile: always visible. md+: hover-expand */}
            <div
              className={`mt-3 sm:mt-4 md:mt-6 text-white/80
                          text-sm sm:text-base md:text-xl
                          transition-all duration-500 overflow-hidden
                          ${hovered === "mission" ? "md:max-h-[400px] md:opacity-100" : "md:max-h-0 md:opacity-0"}
                          max-h-none opacity-100 md:max-h-0 md:opacity-0`}
            >
              <p>{data.mission}</p>
            </div>
          </div>
        )}

        {/* Vision */}
        {data?.vision && (
          <div
            onMouseEnter={() => onEnter("vision")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold cursor-pointer transition-colors duration-300
                          text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                          ${hovered === "vision" ? "text-white" : "text-white/70 md:text-white/50"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Vision
            </h3>

            <div
              className={`mt-3 sm:mt-4 md:mt-6 text-white/80
                          text-sm sm:text-base md:text-xl
                          transition-all duration-500 overflow-hidden
                          ${hovered === "vision" ? "md:max-h-[400px] md:opacity-100" : "md:max-h-0 md:opacity-0"}
                          max-h-none opacity-100 md:max-h-0 md:opacity-0`}
            >
              <p>{data.vision}</p>
            </div>
          </div>
        )}

        {/* Contact */}
        {(data?.contact_email || data?.contact_phone || data?.address) && (
          <div
            onMouseEnter={() => onEnter("contact")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold cursor-pointer transition-colors duration-300
                          text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                          ${hovered === "contact" ? "text-white" : "text-white/70 md:text-white/50"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Contact Us
            </h3>

            <div
              className={`mt-3 sm:mt-4 md:mt-6 text-white/80
                          text-sm sm:text-base md:text-xl
                          transition-all duration-500 overflow-hidden
                          ${hovered === "contact" ? "md:max-h-[400px] md:opacity-100" : "md:max-h-0 md:opacity-0"}
                          max-h-none opacity-100 md:max-h-0 md:opacity-0`}
            >
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                {data.contact_email && (
                  <p className="break-words">
                    📧{" "}
                    <a href={`mailto:${data.contact_email}`} className="underline hover:text-white">
                      {data.contact_email}
                    </a>
                  </p>
                )}
                {data.contact_phone && <p>📞 {data.contact_phone}</p>}
                {data.address && <p className="break-words">📍 {data.address}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Social Links */}
        {data?.social_links && Object.keys(data.social_links).length > 0 && (
          <div
            onMouseEnter={() => onEnter("social")}
            onMouseLeave={() => setHovered(null)}
            className="relative group"
          >
            <h3
              className={`font-bold cursor-pointer transition-colors duration-300
                          text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                          ${hovered === "social" ? "text-white" : "text-white/70 md:text-white/50"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Follow Us
            </h3>

            <div
              className={`mt-3 sm:mt-4 md:mt-6 text-white/80
                          text-sm sm:text-base md:text-xl
                          transition-all duration-500 overflow-hidden
                          ${hovered === "social" ? "md:max-h-[400px] md:opacity-100" : "md:max-h-0 md:opacity-0"}
                          max-h-none opacity-100 md:max-h-0 md:opacity-0`}
            >
              <div className="flex gap-3 sm:gap-4 md:gap-6 flex-wrap items-center">
                {Object.entries(data.social_links).map(([key, value]) => {
                  const icon = data.social_icons?.[key];
                  return (
                    <a
                      key={key}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={key}
                      className="rounded-full flex items-center justify-center
                                 bg-[#101f46] hover:bg-[#162a5e]
                                 transition-colors duration-300
                                 w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20"
                    >
                      {icon ? (
                        <img
                          src={fixURL(icon)}
                          alt={key}
                          className="object-contain rounded-full opacity-90 hover:opacity-60 transition-opacity duration-300
                                     w-7 h-7 sm:w-8 sm:h-8 md:w-14 md:h-14"
                        />
                      ) : (
                        <span className="capitalize text-[11px] sm:text-xs text-white/70 hover:text-white/50 transition-colors duration-300 px-2">
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

      {/* Footer Accent */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto max-w-4xl" />
      <p className="text-center text-white/50 text-xs sm:text-sm md:text-lg py-6 sm:py-8 tracking-wide px-4">
        © {new Date().getFullYear()} GERAIN CHAN — Crafted with emotion, art & technology.
      </p>
    </div>
  );
}
