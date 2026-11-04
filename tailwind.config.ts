import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg": "rgb(var(--bg) / <alpha-value>)",
        "surface": "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "ink": "rgb(var(--ink) / <alpha-value>)",
        "muted": "rgb(var(--muted) / <alpha-value>)",
        "faint": "rgb(var(--faint) / <alpha-value>)",
        "line": "rgb(var(--line) / <alpha-value>)",
        "track": "rgb(var(--track) / <alpha-value>)",
        "accent": "rgb(var(--accent) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        "accent-3": "rgb(var(--accent-3) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        "success": "rgb(var(--success) / <alpha-value>)",
        "danger": "rgb(var(--danger) / <alpha-value>)",
        "warn": "rgb(var(--warn) / <alpha-value>)",
        "info": "rgb(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
