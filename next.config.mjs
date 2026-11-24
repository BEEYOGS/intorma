/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan badge dev Next.js; production juga tidak mengirim header "X-Powered-By".
  devIndicators: false,
  poweredByHeader: false,
  // pdfkit memakai/path dan font bawaan Node; bundling webpack merusak resolusinya.
  serverExternalPackages: ["pdfkit"],
};
export default nextConfig;
