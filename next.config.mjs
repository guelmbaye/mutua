/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the WebMCP registry must not double-register in dev
  eslint: { ignoreDuringBuilds: false },
  poweredByHeader: false,
};

export default nextConfig;
