import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      }
    ]
  },
  serverExternalPackages: ["ssh2"]
};

export default nextConfig;
