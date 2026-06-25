// src/pages/RetailersPage.jsx
import React, { useEffect, useState } from "react";
import http from "../lib/http";

/* Curated showcase boutiques — used to enrich the page when the database has
   only a few retailers. Real (admin-managed) retailers always render first;
   these fill the grid so the maison feels complete. Replace by adding real
   retailers in Admin → Retailers. */
const SHOWCASE = [
  {
    id: "sc-suria",
    name: "Suria Sabah Flagship",
    city: "Kota Kinabalu",
    image_url:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80",
    address:
      "Lot 1-59, 1st Floor, Suria Sabah Shopping Mall, Jalan Tun Fuad Stephens, 88000 Kota Kinabalu",
    hours: "10:00 – 22:00 daily",
    phone: "+60 88-247 767",
    map_url: "https://maps.google.com/?q=Suria+Sabah+Kota+Kinabalu",
  },
  {
    id: "sc-imago",
    name: "Imago Mall Counter",
    city: "Kota Kinabalu",
    image_url:
      "https://images.unsplash.com/photo-1567958451986-2de427a4a0be?w=800&q=80",
    address:
      "Ground Floor, Imago Shopping Mall, KK Times Square, 88100 Kota Kinabalu",
    hours: "Open 24 Hours",
    phone: "+60 88-486 100",
    map_url: "https://maps.google.com/?q=Imago+Mall+Kota+Kinabalu",
  },
  {
    id: "sc-atelier",
    name: "The Atelier",
    city: "By appointment",
    image_url:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=80",
    address:
      "Level 3, Gaya Street, 88000 Kota Kinabalu — private fragrance consultations",
    hours: "11:00 – 19:00 · Tue–Sun",
    email: "hello@gerainchan.com",
    map_url: "https://maps.google.com/?q=Gaya+Street+Kota+Kinabalu",
  },
  {
    id: "sc-gateway",
    name: "Gateway Boutique",
    city: "Kuala Lumpur",
    image_url:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80",
    address: "Lot G-22, Ground Floor, Pavilion KL, 55100 Bukit Bintang, Kuala Lumpur",
    hours: "10:00 – 22:00 daily",
    phone: "+60 3-2148 8833",
    map_url: "https://maps.google.com/?q=Pavilion+Kuala+Lumpur",
  },
  {
    id: "sc-island",
    name: "Island Concept Store",
    city: "Penang",
    image_url:
      "https://images.unsplash.com/photo-1581905764498-f1b60bae941a?w=800&q=80",
    address: "1st Floor, Gurney Plaza, Persiaran Gurney, 10250 George Town, Penang",
    hours: "10:30 – 22:00 daily",
    phone: "+60 4-228 1234",
    map_url: "https://maps.google.com/?q=Gurney+Plaza+Penang",
  },
  {
    id: "sc-online",
    name: "Online Concierge",
    city: "Nationwide",
    image_url:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    address:
      "Complimentary engraving, gift wrapping and AR previews — delivered across Malaysia.",
    hours: "Always open",
    email: "concierge@gerainchan.com",
    map_url: null,
  },
];

const TARGET_COUNT = 6;

const PinIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const ClockIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const PhoneIcon = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.5a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .3l-1 1.2a12 12 0 0 1-5.3-5.3l1.2-1a1 1 0 0 0 .3-1L9.5 4.8a1 1 0 0 0-1-.8H6a2 2 0 0 0-2 2z" />
  </svg>
);

const hoursOf = (r) => {
  if (r.hours) return r.hours;
  if (r.is_open_24h) return "Open 24 Hours";
  if (r.opening_time && r.closing_time)
    return `${r.opening_time.slice(0, 5)} – ${r.closing_time.slice(0, 5)}`;
  return null;
};

export default function RetailersPage() {
  const [retailers, setRetailers] = useState([]);

  useEffect(() => {
    http
      .get("/retailers/")
      .then((res) => setRetailers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load retailers:", err));
  }, []);

  // Real retailers first; fill up to TARGET_COUNT with curated showcase entries.
  const names = new Set(retailers.map((r) => (r.name || "").toLowerCase()));
  const fillers = SHOWCASE.filter((s) => !names.has(s.name.toLowerCase())).slice(
    0,
    Math.max(0, TARGET_COUNT - retailers.length)
  );
  const display = [...retailers, ...fillers];

  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 40% at 50% 0%,rgba(212,175,55,0.12),transparent 60%)" }}
      />

      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 py-12 md:py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="label uppercase text-[11px] text-luxury-gold2 mb-4">Where to Find Us</p>
          <h1 className="font-serif text-5xl sm:text-6xl text-white mb-3">Boutiques</h1>
          <p className="font-cormorant italic text-xl sm:text-2xl text-luxury-champagne">
            Experience the maison in person.
          </p>
        </div>

        {/* Grid */}
        <div className="flex flex-wrap justify-center gap-7">
          {display.map((r) => {
            const hours = hoursOf(r);
            const tel = r.phone ? `tel:${String(r.phone).replace(/\s+/g, "")}` : null;
            return (
              <div
                key={r.id ?? r.name}
                className="card glass rounded-2xl overflow-hidden w-full sm:w-[calc(50%-0.875rem)] lg:w-[calc(33.333%-1.17rem)] max-w-[420px]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-luxury-panel2">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.name}
                      className="w-full h-full object-cover transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-luxury-mut text-sm">
                      {r.name}
                    </div>
                  )}
                </div>
                <div className="p-7">
                  {(r.city || r.region) && (
                    <p className="label uppercase text-[10px] text-luxury-gold2 mb-1.5">
                      {r.city || r.region}
                    </p>
                  )}
                  <h3 className="font-serif text-2xl text-white mb-4">{r.name}</h3>
                  <div className="rule mb-5" />
                  <div className="space-y-3 text-sm text-luxury-mut">
                    {r.address && (
                      <div className="flex items-start gap-3">
                        <PinIcon className="w-4 h-4 mt-0.5 text-luxury-gold2 shrink-0" />
                        <span>{r.address}</span>
                      </div>
                    )}
                    {hours && (
                      <div className="flex items-center gap-3">
                        <ClockIcon className="w-4 h-4 text-luxury-gold2 shrink-0" />
                        <span>{hours}</span>
                      </div>
                    )}
                    {(r.phone || r.email) && (
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="w-4 h-4 text-luxury-gold2 shrink-0" />
                        <span>{r.phone || r.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6">
                    {r.map_url && (
                      <a
                        href={r.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ghost inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] label uppercase"
                      >
                        <PinIcon className="w-3.5 h-3.5" />
                        Directions
                      </a>
                    )}
                    {tel ? (
                      <a
                        href={tel}
                        className="ghost inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] label uppercase"
                      >
                        Call
                      </a>
                    ) : r.email ? (
                      <a
                        href={`mailto:${r.email}`}
                        className="ghost inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] label uppercase"
                      >
                        Email
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
