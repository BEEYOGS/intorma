import type { Config } from "tailwindcss";

// Palette 1 (semantic): Obsidian base + sand, charcoal panels/borders, no light
// vibes. Accent: warm gold/rust (production) + jade (powerup/success).
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0d12",
        carbon: "#0e121a",
        panel: "#141921",
        border: "#2b313c",
        faint: "#8b929c",
        ink: "#eaecee",
        paper: "#f7f8f9",
        gold: "#d9ad82",
        goldDark: "#c38f59",
        jade: "#6abf7b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
