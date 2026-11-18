import type { Config } from "tailwindcss";

// Monokrom gelap: kertas malam, tinta terang. Warna lain hanya untuk status & logo bank.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f1ece3",
        paper: "#0d0d0c",
        panel: "#1b1a17",
        sand: "#161512",
        line: "#39352f",
        mute: "#a8a198",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        tag: "1.1rem 1.1rem 1.1rem 0",
        "tag-sm": "0.75rem 0.75rem 0.75rem 0",
        "tag-lg": "1.75rem 1.75rem 1.75rem 0",
      },
      letterSpacing: { tightest: "-0.055em" },
    },
  },
  plugins: [],
} satisfies Config;
