import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/reliability-analysis-system",
  images: { unoptimized: true },
  // Disable type checking on build to avoid worker type issues
  // in the static export pipeline
};

export default nextConfig;
