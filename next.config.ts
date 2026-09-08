import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: process.env.NEXT_PUBLIC_MEDIA_HOST
      ? [{ protocol: "https", hostname: process.env.NEXT_PUBLIC_MEDIA_HOST }]
      : [],
  },
  // Standalone output is what the container image runs (see Dockerfile), but
  // it makes `next start` unusable, so it is opt-in via the Docker build.
  output: process.env["BUILD_STANDALONE"] === "true" ? "standalone" : undefined,
};

export default withPayload(nextConfig);
