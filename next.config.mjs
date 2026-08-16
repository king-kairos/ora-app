/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [
      {
        source: "/api/ora/:path*",
        destination: "http://127.0.0.1:3001/api/ora/:path*",
      },
      {
        source: "/api/autoprog/:path*",
        destination: "http://127.0.0.1:3001/api/autoprog/:path*",
      },
    ];
  },
};

export default nextConfig;
