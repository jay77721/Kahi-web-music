import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    qualities: [55, 60, 75],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**.music.126.net",
      },
      {
        protocol: "https",
        hostname: "**.music.126.net",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "https",
        hostname: "**.picsum.photos",
      },
    ],
  },
};

export default nextConfig;
