import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0A0A0F",
        "bg-surface": "#141418",
        "bg-raised": "#1C1C22",
        accent: "#6C63FF",
        "text-primary": "#F5F5F7",
        "text-secondary": "#A1A1AA",
        "text-muted": "#52525B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
