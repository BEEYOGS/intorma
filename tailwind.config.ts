import type { Config } from "tailwindcss";

// Vercel/Neon dark: obsidian + perak abu (aksi/lunas), cyan (aktif), amber (menunggu).
// Warna memakai kanal RGB supaya utilitas opacity seperti text-mute/70 tetap bekerja.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        base: "#09090b",
        carbon: "#0f0f11",
        panel: "rgb(17 17 19 / <alpha-value>)",
        sand: "rgb(24 24 27 / <alpha-value>)",
        border: "#27272a",
        line: "rgb(39 39 42 / <alpha-value>)",
        faint: "#71717a",
        ink: "rgb(250 250 250 / <alpha-value>)",
        paper: "rgb(250 250 250 / <alpha-value>)",
        mute: "rgb(161 161 170 / <alpha-value>)",
        gold: "#d4d4d8",
        goldDark: "#a1a1aa",
        jade: "#d4d4d8",
        accent: {
          DEFAULT: "rgb(212 212 216 / <alpha-value>)",
          strong: "#e4e4e7",
          soft: "rgba(212, 212, 216, 0.12)",
        },
        warn: "rgb(245 158 11 / <alpha-value>)",
        info: "rgb(59 130 246 / <alpha-value>)",
        cyan: "rgb(34 211 238 / <alpha-value>)",
        violet: "rgb(167 139 250 / <alpha-value>)",
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
