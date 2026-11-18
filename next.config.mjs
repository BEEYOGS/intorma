/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan badge dev Next.js; production juga tidak mengirim header "X-Powered-By".
  devIndicators: false,
  poweredByHeader: false,
};
export default nextConfig;
