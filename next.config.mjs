import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan badge dev Next.js; production juga tidak mengirim header "X-Powered-By".
  devIndicators: false,
  poweredByHeader: false,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // pdfkit memakai/path dan font bawaan Node; bundling webpack merusak resolusinya.
  serverExternalPackages: ["pdfkit"],
  async headers() {
    // Next.js menyisipkan script inline untuk hidrasi; CSP mengunci sumber
    // lainnya. Upload langsung ke Google Drive butuh connect-src ke googleapis.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com",
      "worker-src 'self' blob:",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
