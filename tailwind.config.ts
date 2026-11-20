import type { Config } from "tailwindcss";

// Ruang cetak: arang dingin + tinta proses C/M/Y/K. Warna status ikut palet proses.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f2efe6",
        paper: "#0b0d10",
        panel: "#13161c",
        sand: "#0f1218",
        line: "#252b35",
        mute: "#8e97a6",
        cyan: "#2ee6ff",
        magenta: "#ff3d8e",
        yellow: "#ffd23f",
        green: "#3fe08c",
        red: "#ff5c5c",
        blue: "#5aa7ff",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Cascadia Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        tag: "0.75rem",
        "tag-sm": "0.5rem",
        "tag-lg": "1rem",
      },
      letterSpacing: { tightest: "-0.05em" },
      boxShadow: {
        ticket: "0 24px 60px -28px rgba(0,0,0,0.85)",
        glow: "0 0 0 1px rgba(46,230,255,0.35), 0 0 24px -6px rgba(46,230,255,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;