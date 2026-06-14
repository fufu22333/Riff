import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        stage: "#f5f7fb",
        signal: "#2f6f73",
        accent: "#d97706"
      }
    }
  },
  plugins: []
};

export default config;
