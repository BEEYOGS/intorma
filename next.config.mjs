import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan badge dev Next.js; production juga tidak mengirim header "X-Powered-By".
  devIndicators: false,
  poweredByHeader: false,
  // pdfkit memakai/path dan font bawaan Node; bundling webpack merusak resolusinya.
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
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
