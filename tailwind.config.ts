import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f1a13",
        muted: "#746b5d",
        line: "#ece3cf",
        panel: "#fffaf0",
        accent: "#ffd84d",
        "accent-strong": "#f8c900",
        "accent-soft": "#fff3bf",
        success: "#168a5f",
        warning: "#c78100",
        danger: "#dc2626"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31, 26, 19, 0.04), 0 10px 28px rgba(31, 26, 19, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
