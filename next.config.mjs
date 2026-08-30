/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the WebMCP registry must not double-register in dev
  eslint: { ignoreDuringBuilds: false },
  poweredByHeader: false,

  // WebMCP is only exposed in origin-isolated documents. Vercel sends this
  // through vercel.json; this covers `next dev`, `next start` and self-hosting.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Origin-Agent-Cluster", value: "?1" }],
      },
    ];
  },
};

export default nextConfig;
