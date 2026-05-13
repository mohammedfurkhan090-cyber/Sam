import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "sam-bg": "#0A0A0A",
        "sam-sidebar": "#0F0F0F",
        "sam-surface": "#1A1A1A",
        "sam-card": "#141414",
        "sam-border": "#1F1F1F",
        "sam-accent": "#D4A017",
        "sam-accent-hover": "#E5B820",
        "sam-green": "#4ADE80",
        "sam-text-primary": "#F5F5F5",
        "sam-text-secondary": "#A3A3A3",
        "sam-text-muted": "#525252",
        "sam-prompt-bg": "#111111",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
