import type { NextConfig } from "next";

const DEFAULT_MINT = "So11111111111111111111111111111111111111112";

const nextConfig: NextConfig = {
  // Self-contained server for the container image (Dockerfile).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async redirects() {
    return [{ source: "/trade", destination: `/trade/${DEFAULT_MINT}`, permanent: false }];
  },
};

export default nextConfig;
