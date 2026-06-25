// src/components/Footer.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";
import {
  FaInstagram,
  FaFacebookF,
  FaTiktok,
  FaYoutube,
  FaGlobe,
} from "react-icons/fa";

const Footer = () => {
  const [siteAbout, setSiteAbout] = useState(null);

  useEffect(() => {
    http
      .get("site/about/")
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data[0]
          : res.data.results?.[0] || null;
        setSiteAbout(data);
      })
      .catch(() => {
        console.warn("Failed to load site-about for footer");
      });
  }, []);

  const year = new Date().getFullYear();
  const socialLinks = siteAbout?.social_links || {};

  const renderSocialIcon = (platform) => {
    const key = platform.toLowerCase();
    if (key.includes("instagram")) return <FaInstagram />;
    if (key.includes("facebook")) return <FaFacebookF />;
    if (key.includes("tiktok")) return <FaTiktok />;
    if (key.includes("youtube")) return <FaYoutube />;
    return <FaGlobe />;
  };

  return (
    <footer className="relative mt-10 border-t border-white/8 bg-luxury-bg text-luxury-text pb-20 md:pb-10 overflow-hidden">
      {/* gold glow */}
      <div
        className="absolute inset-x-0 top-0 h-44 pointer-events-none"
        style={{ background: "radial-gradient(50% 100% at 50% 0%,rgba(212,175,55,0.10),transparent 70%)" }}
      />

      {/* Maison wordmark divider */}
      <div className="relative w-full px-6 lg:px-16 pt-12">
        <div className="flex items-center gap-5 sm:gap-6 max-w-screen-2xl mx-auto">
          <div className="flex-1 gold-rule" />
          <Link
            to="/"
            className="font-serif text-xl sm:text-2xl tracking-[0.3em] text-white hover:text-luxury-champagne transition whitespace-nowrap"
          >
            GÉRAIN&nbsp;CHAN
          </Link>
          <div className="flex-1 gold-rule" />
        </div>
      </div>

      {/* Columns */}
      <div className="relative w-full max-w-screen-2xl mx-auto px-6 lg:px-16 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* ABOUT */}
        <div className="space-y-3">
          <p className="label uppercase text-[11px] text-luxury-gold/80">The Maison</p>
          <p className="text-sm text-luxury-mut leading-relaxed">
            {siteAbout?.intro_text ||
              "A modern maison blending scent, storytelling and technology — perfumery for the digital age."}
          </p>
        </div>

        {/* CONTACT */}
        <div className="space-y-3">
          <p className="label uppercase text-[11px] text-luxury-gold/80">Contact</p>
          {siteAbout?.contact_email && (
            <p>
              <a
                href={`mailto:${siteAbout.contact_email}`}
                className="text-sm text-luxury-text hover:text-luxury-gold2 transition"
              >
                {siteAbout.contact_email}
              </a>
            </p>
          )}
          {siteAbout?.contact_phone && (
            <p>
              <a
                href={`tel:${siteAbout.contact_phone}`}
                className="text-sm text-luxury-text hover:text-luxury-gold2 transition"
              >
                {siteAbout.contact_phone}
              </a>
            </p>
          )}
          {siteAbout?.address && (
            <p className="text-sm text-luxury-mut whitespace-pre-line leading-relaxed">
              {siteAbout.address}
            </p>
          )}
        </div>

        {/* EXPLORE */}
        <div className="space-y-3">
          <p className="label uppercase text-[11px] text-luxury-gold/80">Explore</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/shop" className="hover:text-luxury-gold2 transition">Shop</Link>
            </li>
            <li>
              <Link to="/quiz" className="hover:text-luxury-gold2 transition">Scent Quiz</Link>
            </li>
            <li>
              <Link to="/settings/retailers" className="hover:text-luxury-gold2 transition">Boutiques</Link>
            </li>
            <li>
              <Link to="/settings/about" className="hover:text-luxury-gold2 transition">The Maison</Link>
            </li>
          </ul>
        </div>

        {/* FOLLOW */}
        <div className="space-y-3">
          <p className="label uppercase text-[11px] text-luxury-gold/80">Follow</p>
          <p className="text-sm text-luxury-mut leading-relaxed mb-1">
            Releases, AR experiences and the people who compose them.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {Object.entries(socialLinks).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-full border border-luxury-gold/40 flex items-center justify-center text-luxury-gold2 hover:text-luxury-bg hover:bg-luxury-gold hover:border-luxury-gold transition"
              >
                {renderSocialIcon(platform)}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative w-full max-w-screen-2xl mx-auto px-6 lg:px-16 pt-6 border-t border-white/8 flex flex-col md:flex-row items-center justify-center md:justify-between text-[10px] label uppercase text-luxury-mut text-center gap-2">
        <span>© {year} Gérain Chan. All rights reserved.</span>
        <span>Immersive Perfume · AR Experience</span>
      </div>
    </footer>
  );
};

export default Footer;
