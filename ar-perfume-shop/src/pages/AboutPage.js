import React, { useEffect, useRef, useState } from "react";
import http from "../lib/http";
import PageHeader from "../components/PageHeader";

/* -------------------- Font Loader -------------------- */
const loadFont = () => {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Open+Sans:wght@400;600&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

/* -------------------- Expandable Section -------------------- */
function ExpandableSection({ id, title, isOpen, onToggle, children }) {
  const bodyRef = useRef(null);
  const [maxH, setMaxH] = useState("0px");

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    if (isOpen) {
      setMaxH(`${el.scrollHeight}px`);
    } else {
      setMaxH("0px");
    }
  }, [isOpen, children]);

  // Recalculate height on resize (important for desktop)
  useEffect(() => {
    const onResize = () => {
      const el = bodyRef.current;
      if (!el) return;
      if (isOpen) setMaxH(`${el.scrollHeight}px`);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen]);

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full opacity-40 blur-md bg-white/10" />
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full text-left group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between gap-4">
          <h3
            className={`font-bold transition-colors duration-300
                        text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                        ${isOpen ? "text-white" : "text-white/70 md:text-white/50"}
                        group-hover:text-white`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h3>

          <span
            className={`text-white/70 transition-transform duration-300
                        ${isOpen ? "rotate-180" : "rotate-0"}`}
          >
            ▼
          </span>
        </div>
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out"
        style={{
          maxHeight: maxH,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          ref={bodyRef}
          className="mt-3 sm:mt-4 md:mt-6 text-white/80
                    text-sm sm:text-base md:text-xl
                    pb-4 md:pb-6"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------- About Page -------------------- */
export default function AboutPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // only one open at a time
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    loadFont();

    const fetchAbout = async () => {
      try {
        const res = await http.get("/site/about/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          const about = res.data[0];

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
        console.error(err);
        setError("Failed to load content.");
      } finally {
        setLoading(false);
      }
    };

    fetchAbout();
  }, []);

  const toggle = (key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const fixURL = (url) =>
    url?.startsWith("http") ? url : `http://127.0.0.1:8000${url}`;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-xl">
        Loading About page…
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a3a] text-white text-xl">
        {error}
      </div>
    );

  return (
    <div
      className="min-h-screen bg-[#0c1a3a] text-white"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
    >
      {/* Hero */}
      {data?.hero_image_url && (
        <img
          src={data.hero_image_url}
          alt="About banner"
          className="w-full max-h-[80vh] object-cover"
        />
      )}

      {/* Story */}
      <section className="px-4 sm:px-6 md:px-16 lg:px-24 xl:px-32 py-12 md:py-20">
        <div className="max-w-6xl mx-auto mb-6">
          <PageHeader title="" />
        </div>

        <h1
          className="text-center font-bold mb-10
                     text-3xl sm:text-4xl md:text-6xl lg:text-7xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {data?.title || "About GERAIN CHAN"}
        </h1>

        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10
                        text-base sm:text-lg md:text-2xl text-white/90">
          {data?.intro_text && <p>{data.intro_text}</p>}
          {data?.body_text && (
            <p className="whitespace-pre-line">{data.body_text}</p>
          )}
        </div>
      </section>

      {/* Expandables */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-16 lg:px-24 pb-24
                          grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
        {data?.mission && (
          <ExpandableSection
            id="mission"
            title="Our Mission"
            isOpen={openKey === "mission"}
            onToggle={toggle}
          >
            <p>{data.mission}</p>
          </ExpandableSection>
        )}

        {data?.vision && (
          <ExpandableSection
            id="vision"
            title="Our Vision"
            isOpen={openKey === "vision"}
            onToggle={toggle}
          >
            <p>{data.vision}</p>
          </ExpandableSection>
        )}

        {(data?.contact_email || data?.contact_phone || data?.address) && (
          <ExpandableSection
            id="contact"
            title="Contact Us"
            isOpen={openKey === "contact"}
            onToggle={toggle}
          >
            {data.contact_email && (
              <p>
                📧{" "}
                <a
                  href={`mailto:${data.contact_email}`}
                  className="underline"
                >
                  {data.contact_email}
                </a>
              </p>
            )}
            {data.contact_phone && <p>📞 {data.contact_phone}</p>}
            {data.address && <p>📍 {data.address}</p>}
          </ExpandableSection>
        )}

        {data?.social_links && (
          <ExpandableSection
            id="social"
            title="Follow Us"
            isOpen={openKey === "social"}
            onToggle={toggle}
          >
            <div
              className="flex flex-wrap items-center gap-4 sm:gap-5 md:gap-6
                        pt-3 pb-2 md:pt-4"
            >
              {Object.entries(data.social_links).map(([k, v]) => {
                const icon = data.social_icons?.[k];
                return (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-14 h-14 md:w-20 md:h-20
                              rounded-full flex items-center justify-center
                              bg-[#101f46] hover:bg-[#162a5e]
                              transition-colors duration-300"
                  >
                    {icon ? (
                      <img
                        src={fixURL(icon)}
                        alt={k}
                        className="w-7 h-7 md:w-14 md:h-14 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-white/70 capitalize">
                        {k}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </ExpandableSection>
        )}
      </section>

      {/* Footer */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto max-w-4xl" />
      <p className="text-center text-white/50 text-sm md:text-lg py-8">
        © {new Date().getFullYear()} GERAIN CHAN — Crafted with emotion, art & technology.
      </p>
    </div>
  );
}
