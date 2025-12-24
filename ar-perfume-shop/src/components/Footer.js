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
    <footer
      className="
        mt-12 border-t border-sky-500/20 bg-[#050b1f] text-sky-100
        pb-20 md:pb-10  /* keep copyright above BottomNav on small screens */
      "
    >
      {/* 4 columns, full width */}
      <div className="w-full px-6 lg:px-16 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* ABOUT */}
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold tracking-[0.2em] text-white uppercase">
            {siteAbout?.title || "GERAIN CHAN"}
          </h2>
          <p className="text-sm text-sky-200/80 leading-relaxed">
            {siteAbout?.intro_text ||
              "Immersive perfume experiences, online and in-store."}
          </p>
        </div>

        {/* CONTACT */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
            Contact
          </h3>

          {siteAbout?.contact_email && (
            <p>
              <a
                href={`mailto:${siteAbout.contact_email}`}
                className="hover:text-white underline underline-offset-2"
              >
                {siteAbout.contact_email}
              </a>
            </p>
          )}

          {siteAbout?.contact_phone && (
            <p>
              <a
                href={`tel:${siteAbout.contact_phone}`}
                className="hover:text-white"
              >
                {siteAbout.contact_phone}
              </a>
            </p>
          )}

          {siteAbout?.address && (
            <p className="whitespace-pre-line">{siteAbout.address}</p>
          )}
        </div>

        {/* EXPLORE */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
            Explore
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/shop" className="hover:text-white">
                Shop
              </Link>
            </li>
            <li>
              <Link to="/quiz" className="hover:text-white">
                Fragrance Quiz
              </Link>
            </li>
            <li>
              <Link to="/settings/retailers" className="hover:text-white">
                Retail Partners
              </Link>
            </li>
            <li>
              <Link to="/settings/about" className="hover:text-white">
                About Us
              </Link>
            </li>
          </ul>
        </div>

        {/* FOLLOW */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
            Follow
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(socialLinks).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full border border-sky-500/40 flex items-center justify-center text-sky-200 hover:text-[#0c1a3a] hover:bg-sky-300 hover:border-sky-300 transition"
              >
                {renderSocialIcon(platform)}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div
        className="
          w-full px-6 lg:px-16 py-4
          flex flex-col md:flex-row
          items-center
          justify-center md:justify-between
          text-[11px] text-sky-300/80
          text-center md:text-left
          gap-1
        "
      >
        <span>© {year} GERAIN CHAN. All rights reserved.</span>
        <span className="uppercase tracking-[0.2em]">
          Immersive Perfume · AR Experience
        </span>
      </div>
    </footer>
  );
};

export default Footer;
