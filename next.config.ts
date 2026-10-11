import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // COMMERCE 360 moved out of the dashboard frame to its own full-screen route.
  async redirects() {
    return [{ source: '/dashboard/commerce360/:path*', destination: '/commerce360/:path*', permanent: false }]
  },
};

export default nextConfig;
