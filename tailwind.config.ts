import type { Config } from "tailwindcss";

// Tema gelap obsidian + aksen biru #0070f3 (turunan #3291ff untuk teks kecil).
// Warna memakai kanal RGB supaya utilitas opacity seperti text-mute/70 tetap bekerja.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        // Tidak ada warna bernama `base`: itu bertabrakan dengan utilitas
        // font-size `text-base` dan membuat teks legal berubah hitam.
        carbon: "#0f0f11",
        panel: "rgb(17 17 19 / <alpha-value>)",
        sand: "rgb(24 24 27 / <alpha-value>)",
        border: "#27272a",
        line: "rgb(39 39 42 / <alpha-value>)",
        faint: "#8a8a93",
        ink: "rgb(250 250 250 / <alpha-value>)",
        paper: "rgb(250 250 250 / <alpha-value>)",
        mute: "rgb(161 161 170 / <alpha-value>)",
        quiet: "rgb(161 161 170 / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(0 112 243 / <alpha-value>)",
          strong: "#3291ff",
          deep: "#0059c9",
          soft: "rgba(0, 112, 243, 0.12)",
        },
        danger: "rgb(239 68 68 / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      // Semua kartu, tombol, input, dan tag memakai sudut kiri bawah tajam.
      // Dot/progress/radio tetap memakai rounded-full sesuai kebutuhan.
      borderRadius: {
        tag: "0.5rem 0.5rem 0.5rem 0",
        "tag-sm": "0.375rem 0.375rem 0.375rem 0",
        "tag-lg": "0.75rem 0.75rem 0.75rem 0",
      },
    },
  },
  plugins: [],
} satisfies Config;
