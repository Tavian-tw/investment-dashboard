import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f7f6f2",
        line: "#d7d2c8",
        accent: "#ab3b1f",
        bull: "#0b7a4b",
        bear: "#b42318",
        neutral: "#57534e",
      },
      boxShadow: {
        card: "0 18px 40px rgba(17, 24, 39, 0.08)",
      },
      fontFamily: {
        sans: ["'Segoe UI'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
