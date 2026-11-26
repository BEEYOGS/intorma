import type { Config } from "tailwindcss";

// Monokrom premium: obsidian, perak, dan putih. Merah hanya untuk batal/bahaya.
// Warna memakai kanal RGB supaya utilitas opacity seperti text-mute/70 tetap bekerja.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        base: "#080808",
        carbon: "#0d0d0d",
        panel: "rgb(17 17 17 / <alpha-value>)",
        sand: "rgb(23 23 23 / <alpha-value>)",
        border: "#262626",
        line: "rgb(38 38 38 / <alpha-value>)",
        faint: "#8a8a93",
        ink: "rgb(246 246 246 / <alpha-value>)",
        paper: "rgb(246 246 246 / <alpha-value>)",
        mute: "rgb(164 164 164 / <alpha-value>)",
        gold: "#f4f4f4",
        goldDark: "#d4d4d4",
        jade: "#d4d4d4",
        accent: {
          DEFAULT: "rgb(244 244 244 / <alpha-value>)",
          strong: "#ffffff",
          soft: "rgba(255, 255, 255, 0.08)",
        },
        warn: "rgb(212 212 212 / <alpha-value>)",
        info: "rgb(161 161 161 / <alpha-value>)",
        cyan: "rgb(228 228 228 / <alpha-value>)",
        violet: "rgb(199 199 199 / <alpha-value>)",
        danger: "rgb(239 68 68 / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        tag: "0.5rem",
        "tag-sm": "0.375rem",
        "tag-lg": "0.75rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
