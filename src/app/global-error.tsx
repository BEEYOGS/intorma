"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", width: "100%" }}>
          <p style={{ fontSize: "0.75rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#a1a1aa", margin: 0 }}>
            Error
          </p>
          <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1rem" }}>Ada yang salah.</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            {error.digest ? `Kode: ${error.digest}` : "Terjadi kesalahan tak terduga saat memuat aplikasi."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "48px",
              padding: "0 1rem",
              border: "1px solid #27272a",
              borderRadius: 0,
              background: "#fafafa",
              color: "#09090b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
