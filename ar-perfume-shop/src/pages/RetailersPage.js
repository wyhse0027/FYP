import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../lib/http";
import { IoLocationOutline, IoTimeOutline, IoCallOutline } from "react-icons/io5";

export default function RetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    http
      .get("/retailers/")
      .then((res) => setRetailers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load retailers:", err));
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#081534] px-4 sm:px-6 md:px-10 lg:px-16 py-6 sm:py-10 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-[1500px] flex items-center justify-between mb-6 sm:mb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full hover:bg-white/10 transition p-2"
          title="Back"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="34"
            className="sm:w-[44px] sm:h-[44px]"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif text-white text-center flex-1 drop-shadow-lg tracking-wide">
          Retailers
        </h1>

        <div className="w-10 sm:w-14 md:w-16" /> {/* Spacer */}
      </div>

      {/* Retailers List */}
      <div className="w-full flex flex-col items-center gap-6 sm:gap-8 md:gap-12">
        {retailers.map((r) => {
          const isExpanded = expanded === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setExpanded(isExpanded ? null : r.id)}
              className={[
                "bg-[#0f1f4b] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg transition-all duration-500 cursor-pointer w-full max-w-[1200px]",
                isExpanded
                  ? "shadow-[0_0_26px_rgba(0,255,255,0.22)] sm:shadow-[0_0_30px_rgba(0,255,255,0.3)] sm:scale-[1.01]"
                  : "hover:shadow-[0_0_22px_rgba(0,255,255,0.18)]",
              ].join(" ")}
            >
              {/* Retailer Image */}
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt={r.name}
                  className="w-full h-[200px] sm:h-[280px] md:h-[360px] lg:h-[450px] object-cover"
                />
              )}

              {/* Retailer Name */}
              <h3 className="text-center text-xl sm:text-2xl md:text-4xl font-semibold text-white py-4 sm:py-5 md:py-6 font-[Playfair_Display] px-4">
                {r.name}
              </h3>

              {/* Expanded Info */}
              <div
                className={[
                  "transition-all duration-500 overflow-hidden",
                  isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
              >
                <div className="flex flex-col md:flex-row justify-center md:justify-around items-start md:items-center text-white pb-5 sm:pb-7 md:pb-8 px-4 sm:px-6 md:px-10 gap-5 sm:gap-7 md:gap-10">
                  {/* Location */}
                  <div className="flex items-start gap-3 sm:gap-4 max-w-lg text-white/80">
                    <IoLocationOutline
                      size={24}
                      className="sm:text-[32px] md:text-[40px] text-cyan-300 flex-shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base md:text-lg leading-relaxed break-words">
                        {r.address}
                      </p>
                      {r.map_url && (
                        <a
                          href={r.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline mt-1.5 inline-block text-sm sm:text-base"
                          onClick={(e) => e.stopPropagation()} // prevent collapsing when tapping link
                        >
                          View on Google Maps →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-3 sm:gap-4 text-white/80 max-w-lg">
                    <IoTimeOutline
                      size={24}
                      className="sm:text-[32px] md:text-[40px] text-cyan-300 flex-shrink-0 mt-0.5"
                    />
                    {r.is_open_24h ? (
                      <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                        Open 24 Hours
                      </p>
                    ) : (
                      <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                        Hours: {r.opening_time?.slice(0, 5)} –{" "}
                        {r.closing_time?.slice(0, 5)}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3 sm:gap-4 text-white/80 max-w-lg">
                    <IoCallOutline
                      size={24}
                      className="sm:text-[32px] md:text-[40px] text-cyan-300 flex-shrink-0 mt-0.5"
                    />
                    {/* make phone tappable on mobile */}
                    {r.phone ? (
                      <a
                        href={`tel:${String(r.phone).replace(/\s+/g, "")}`}
                        className="text-sm sm:text-base md:text-lg leading-relaxed hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.phone}
                      </a>
                    ) : (
                      <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                        —
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!retailers.length && (
          <div className="text-white/70 text-sm sm:text-base py-10">
            No retailers found.
          </div>
        )}
      </div>
    </div>
  );
}
