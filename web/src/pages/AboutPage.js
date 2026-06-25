// src/pages/AboutPage.jsx
import React, { useEffect, useState } from "react";
import http from "../lib/http";

/* Curated defaults so the page reads as a complete maison story even when the
   CMS record is sparse. Any field present in the DB overrides its default. */
const DEFAULTS = {
  title: "Gérain Chan",
  tagline: "Where scent, storytelling and technology become one.",
  intro_text:
    "A modern maison born in Kota Kinabalu — composing fragrances that live as much in memory as in the air.",
  body_text:
    "Every Gérain Chan creation is an encounter: a bottle you can place in your own world through augmented reality, a scent profiled to your character, and a story that lingers long after the room empties. We blend old-world perfumery with the tools of the digital age — so discovery feels personal, immersive and quietly unforgettable.",
  mission_title: "Scent, made personal",
  mission:
    "To make luxury fragrance feel personal and immersive — guiding every visitor to a signature scent that is unmistakably theirs, online or in person.",
  vision_title: "The future of perfumery",
  vision:
    "A house where artistry and technology meet — where augmented reality, scent personas and craft come together to redefine how the world discovers perfume.",
  contact_email: "hello@gerainchan.com",
  contact_phone: "+60 88-247 767",
  address: "Suria Sabah, Kota Kinabalu, Sabah, Malaysia",
  follow_text:
    "Step behind the scenes — new releases, AR experiences and the people who compose them.",
};

const HERO_FALLBACK =
  "https://storage.googleapis.com/eleganza-ar-media-439528178601/products/cards/n_long_promo_eelsgp";

const MailIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const PhoneIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.5a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .3l-1 1.2a12 12 0 0 1-5.3-5.3l1.2-1a1 1 0 0 0 .3-1L9.5 4.8a1 1 0 0 0-1-.8H6a2 2 0 0 0-2 2z" />
  </svg>
);
const PinIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const DEFAULT_SOCIAL = {
  instagram: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </svg>
  ),
  facebook: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 22v-8h3l1-4h-4V7.5c0-1 .3-1.7 1.8-1.7H17V2.2A24 24 0 0 0 14.6 2C12 2 10 3.7 10 6.9V10H7v4h3v8z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 3v10.5a3.5 3.5 0 1 1-2-3.16V3zm2 0a4 4 0 0 0 4 4V5a2 2 0 0 1-2-2z" />
    </svg>
  ),
};

export default function AboutPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get("/site/about/")
      .then((res) => {
        const about =
          Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data || null;
        if (about && typeof about.social_icons === "string") {
          try {
            about.social_icons = JSON.parse(about.social_icons);
          } catch {
            about.social_icons = {};
          }
        }
        setData(about);
      })
      .catch((err) => console.error("Failed to load about:", err))
      .finally(() => setLoading(false));
  }, []);

  const f = (key) => (data && data[key]) || DEFAULTS[key];
  const fixURL = (url) => (url?.startsWith("http") ? url : `${url || ""}`);

  if (loading) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-luxury-gold/80 border-t-transparent rounded-full animate-spin-gold" />
      </div>
    );
  }

  const hero = data?.hero_image_url || HERO_FALLBACK;
  const socialLinks = data?.social_links && Object.keys(data.social_links).length
    ? data.social_links
    : null;

  return (
    <div className="relative">
      {/* Editorial hero */}
      <section className="relative h-[58vh] min-h-[400px] overflow-hidden flex items-end">
        <img src={hero} alt="The maison" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(7,11,20,0.55) 0%,rgba(7,11,20,0.25) 40%,rgba(7,11,20,0.97) 100%)",
          }}
        />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 pb-12 md:pb-14 w-full">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">The House</p>
          <h1 className="font-serif text-5xl sm:text-7xl text-white leading-[0.95] mb-4">{f("title")}</h1>
          <p className="font-cormorant italic text-2xl sm:text-3xl text-luxury-champagne max-w-2xl">
            {f("tagline")}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 py-14 md:py-16 text-center">
        <div className="w-16 rule mx-auto mb-8" />
        <p className="font-cormorant italic text-2xl sm:text-3xl text-luxury-champagne leading-relaxed mb-8">
          {f("intro_text")}
        </p>
        <p className="text-base text-luxury-mut leading-relaxed whitespace-pre-line">{f("body_text")}</p>
      </section>

      {/* Mission / Vision */}
      <section className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 pb-6">
        <div className="flex flex-wrap justify-center gap-7">
          <div className="glass rounded-3xl p-9 w-full md:w-[calc(50%-0.875rem)] max-w-2xl">
            <p className="label uppercase text-[11px] text-luxury-gold2 mb-3">Our Mission</p>
            <h3 className="font-serif text-3xl text-white mb-4">{f("mission_title")}</h3>
            <p className="text-luxury-mut leading-relaxed">{f("mission")}</p>
          </div>
          <div className="glass rounded-3xl p-9 w-full md:w-[calc(50%-0.875rem)] max-w-2xl">
            <p className="label uppercase text-[11px] text-luxury-gold2 mb-3">Our Vision</p>
            <h3 className="font-serif text-3xl text-white mb-4">{f("vision_title")}</h3>
            <p className="text-luxury-mut leading-relaxed">{f("vision")}</p>
          </div>
        </div>
      </section>

      {/* Contact + Follow */}
      <section className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12">
        <div className="flex flex-wrap justify-center gap-7">
          {/* Contact */}
          <div className="glass rounded-3xl p-9 w-full md:w-[calc(50%-0.875rem)] max-w-2xl">
            <p className="label uppercase text-[11px] text-luxury-gold2 mb-6">Contact Us</p>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center text-luxury-gold2 shrink-0">
                  <MailIcon className="w-5 h-5" />
                </span>
                <a href={`mailto:${f("contact_email")}`} className="text-luxury-text hover:text-luxury-gold2 transition">
                  {f("contact_email")}
                </a>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center text-luxury-gold2 shrink-0">
                  <PhoneIcon className="w-5 h-5" />
                </span>
                <a href={`tel:${String(f("contact_phone")).replace(/\s+/g, "")}`} className="text-luxury-text hover:text-luxury-gold2 transition">
                  {f("contact_phone")}
                </a>
              </div>
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-luxury-gold/10 border border-luxury-gold/25 flex items-center justify-center text-luxury-gold2 shrink-0">
                  <PinIcon className="w-5 h-5" />
                </span>
                <span className="text-luxury-mut leading-relaxed">{f("address")}</span>
              </div>
            </div>
          </div>

          {/* Follow */}
          <div className="glass rounded-3xl p-9 w-full md:w-[calc(50%-0.875rem)] max-w-2xl flex flex-col">
            <p className="label uppercase text-[11px] text-luxury-gold2 mb-6">Follow the House</p>
            <p className="text-luxury-mut leading-relaxed mb-7">{f("follow_text")}</p>
            <div className="flex flex-wrap gap-4 mt-auto">
              {socialLinks
                ? Object.entries(socialLinks).map(([k, v]) => {
                    const icon = data?.social_icons?.[k];
                    return (
                      <a
                        key={k}
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-14 h-14 rounded-full border border-luxury-gold/40 text-luxury-gold2 hover:bg-luxury-gold hover:text-luxury-bg hover:border-luxury-gold transition flex items-center justify-center"
                        title={k}
                      >
                        {icon ? (
                          <img src={fixURL(icon)} alt={k} className="w-6 h-6 object-contain" />
                        ) : (
                          DEFAULT_SOCIAL[k.toLowerCase()] || (
                            <span className="text-[10px] label uppercase">{k.slice(0, 2)}</span>
                          )
                        )}
                      </a>
                    );
                  })
                : Object.entries(DEFAULT_SOCIAL).map(([k, icon]) => (
                    <a
                      key={k}
                      href="#"
                      className="w-14 h-14 rounded-full border border-luxury-gold/40 text-luxury-gold2 hover:bg-luxury-gold hover:text-luxury-bg hover:border-luxury-gold transition flex items-center justify-center"
                      title={k}
                    >
                      {icon}
                    </a>
                  ))}
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 text-center text-[10px] label uppercase text-luxury-mut pb-10">
        © {new Date().getFullYear()} Gérain Chan · Crafted with emotion, art &amp; technology
      </div>
    </div>
  );
}
