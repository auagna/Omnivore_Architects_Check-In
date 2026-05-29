import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        panel: "#f8fafc",
        line: "#cbd5e1",
        soft: "#475569"
      },
      boxShadow: {
        glow: "0 18px 50px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
