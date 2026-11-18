import type { Config } from "tailwindcss";

// Palet brand: hitam, putih, abu. Warna lain hanya untuk status (lihat src/lib/status.ts).
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        panel: "#121212",
        line: "#2b2b2b",
        mute: "#808080",
        soft: "#c8c8c8",
      },
      fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] },
      // Bentuk khas logo: tiga sudut bulat, satu sudut tetap siku.
      borderRadius: {
        tag: "1.75rem 1.75rem 1.75rem 0",
        "tag-r": "1.75rem 1.75rem 0 1.75rem",
        "tag-sm": "1rem 1rem 1rem 0",
      },
      letterSpacing: { tightest: "-0.06em" },
    },
  },
  plugins: [],
} satisfies Config;
