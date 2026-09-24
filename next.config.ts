import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    // A static export ships no optimiser, so `next/image` must be told which
    // widths exist on disk; `src/lib/image-loader.ts` maps a request onto one.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [480, 900, 1920],
    imageSizes: [256],
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_HOST
      ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_MEDIA_HOST }]
      : [],
  },
};

export default nextConfig;
