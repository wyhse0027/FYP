import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../lib/http";
import { IoLocationOutline, IoTimeOutline, IoCallOutline } from "react-icons/io5";

export default function RetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    http
      .get("/retailers/")
      .then((res) => setRetailers(res.data))
      .catch((err) => console.error("Failed to load retailers:", err));
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#081534] px-6 md:px-10 lg:px-16 py-10 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-[1500px] flex items-center justify-between mb-10">
        <Link
          to="/settings"
          className="flex items-center justify-center rounded-full hover:bg-white/10 transition p-2"
          title="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="52"
            height="52"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </Link>

        <h1 className="text-5xl font-serif text-white text-center flex-1 drop-shadow-lg tracking-wide">
          Retailers
        </h1>

        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Retailers List */}
      <div className="w-full flex flex-col items-center gap-12">
        {retailers.map((r) => {
          const isExpanded = expanded === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setExpanded(isExpanded ? null : r.id)}
              className={`bg-[#0f1f4b] rounded-3xl overflow-hidden shadow-lg transition-all duration-500 cursor-pointer w-full max-w-[1200px]
                ${isExpanded ? "shadow-[0_0_30px_rgba(0,255,255,0.3)] scale-[1.02]" : "hover:shadow-[0_0_25px_rgba(0,255,255,0.2)]"}
              `}
            >
              {/* Retailer Image */}
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt={r.name}
                  className="w-full h-[450px] object-cover"
                />
              )}

              {/* Retailer Name */}
              <h3 className="text-center text-4xl font-semibold text-white py-6 font-[Playfair_Display]">
                {r.name}
              </h3>

              {/* Expanded Info */}
              <div
                className={`transition-all duration-500 overflow-hidden ${
                  isExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-center sm:justify-around items-center text-white pb-8 px-10 gap-10">
                  {/* Location */}
                  <div className="flex items-center gap-4 max-w-sm text-white/80">
                    <IoLocationOutline
                      size={40}
                      className="text-cyan-300 flex-shrink-0"
                    />
                    <div>
                      <p className="text-lg leading-relaxed">{r.address}</p>
                      {r.map_url && (
                        <a
                          href={r.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline mt-2 inline-block text-base"
                        >
                          View on Google Maps →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-center gap-4 text-white/80 max-w-sm">
                    <IoTimeOutline
                      size={40}
                      className="text-cyan-300 flex-shrink-0"
                    />
                    {r.is_open_24h ? (
                      <p className="text-lg leading-relaxed">Open 24 Hours</p>
                    ) : (
                      <p className="text-lg leading-relaxed">
                        Hours: {r.opening_time?.slice(0, 5)} –{" "}
                        {r.closing_time?.slice(0, 5)}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-4 text-white/80 max-w-sm">
                    <IoCallOutline
                      size={40}
                      className="text-cyan-300 flex-shrink-0"
                    />
                    <p className="text-lg leading-relaxed">{r.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
