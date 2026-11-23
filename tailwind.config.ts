import type { Config } from "tailwindcss";

// Monokrom: hitam, putih, abu + satu aksen hangat. Merah hanya untuk status/peringatan.
// Warna memakai kanal RGB supaya utilitas opacity seperti text-mute/70 tetap bekerja.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0a",
        carbon: "#121212",
        panel: "rgb(23 23 23 / <alpha-value>)",
        sand: "rgb(31 31 31 / <alpha-value>)",
        border: "#2e2e2e",
        line: "rgb(46 46 46 / <alpha-value>)",
        faint: "#7a7a7a",
        ink: "rgb(245 245 245 / <alpha-value>)",
        paper: "rgb(245 245 245 / <alpha-value>)",
        mute: "rgb(184 184 184 / <alpha-value>)",
        gold: "#e6e6e6",
        goldDark: "#bfbfbf",
        jade: "#b8b8b8",
        accent: {
          DEFAULT: "rgb(230 230 230 / <alpha-value>)",
          strong: "#bfbfbf",
          soft: "rgba(255, 255, 255, 0.10)",
        },
        danger: "rgb(212 90 74 / <alpha-value>)",
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
