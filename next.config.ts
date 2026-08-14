import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export default nextConfig;

