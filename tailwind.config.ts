import type { Config } from "tailwindcss";

// Monochrome intorma: ramp lima nada dari swatch merek (terang -> hitam).
// Sudut khas: kiri-atas, kanan-atas, kanan-bawah rounded; kiri-bawah tajam.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f5f7f9",
        silver: "#c6c8c9",
        steel: "#8a8d8e",
        coal: "#3a3d3d",
        ash: "#6d7275",
        paper: "#070809",
        panel: "#14161a",
        sand: "#0e1013",
        line: "#2b2f33",
        mute: "#9ba0a3",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Cascadia Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        "tag-xs": "0.35rem 0.35rem 0.35rem 0",
        "tag-sm": "0.7rem 0.7rem 0.7rem 0",
        tag: "1.1rem 1.1rem 1.1rem 0",
        "tag-lg": "1.6rem 1.6rem 1.6rem 0",
        "tag-xl": "2.2rem 2.2rem 2.2rem 0",
      },
      letterSpacing: { tightest: "-0.05em" },
      boxShadow: {
        ticket: "0 24px 60px -28px rgba(0,0,0,0.85)",
        glow: "0 0 0 1px rgba(245,247,249,0.35), 0 0 24px -6px rgba(245,247,249,0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config;