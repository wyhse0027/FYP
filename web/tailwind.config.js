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
          navy: "#0B1222",        // legacy alias → dark surface
          gold: "#D4AF37",
          gold2: "#F3D37A",
          accent: "#F3D37A",      // legacy alias → gold accent
          champagne: "#F7E7CE",
          silver: "#C2C7D0",      // secondary text on dark
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
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'lux-pan': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '220% 0' } },
        'lux-sweep': { '0%': { left: '-70%' }, '100%': { left: '130%' } },
        'spin-gold': { to: { transform: 'rotate(360deg)' } },
        bar: { '0%': { transform: 'translateX(-130%)' }, '100%': { transform: 'translateX(420%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'lux-pan': 'lux-pan 7s linear infinite',
        'spin-gold': 'spin-gold 0.9s linear infinite',
        bar: 'bar 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
