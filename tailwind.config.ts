import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14171f",
        paper: "#f7f8fa",
        card: "#ffffff",
        border: "#e4e7ec",
        muted: "#6b7280",
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          300: "#8fb4ff",
          500: "#3d6dfb",
          600: "#2f56d6",
          700: "#2544ab",
        },
        accent: {
          teal: "#0f9d8c",
          amber: "#e8a33d",
          coral: "#e0637a",
          violet: "#8a63d2",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,23,31,0.04), 0 1px 8px rgba(20,23,31,0.04)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
