/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        luxury: {
          bg: "#070B14",          // deep black-blue
          panel: "#0B1222",       // card background
          panel2: "#0E1830",      // hover / modal
          gold: "#D4AF37",
          gold2: "#F3D37A",
          champagne: "#F7E7CE",
        },
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,0.25), 0 20px 60px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "gold-radial":
          "radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(212,175,55,0.12), transparent 55%)",
        "gold-gradient":
          "linear-gradient(90deg, rgba(212,175,55,1), rgba(243,211,122,1))",
      },
    },
  },
  plugins: [],
};
