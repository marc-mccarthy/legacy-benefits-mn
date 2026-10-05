import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
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
