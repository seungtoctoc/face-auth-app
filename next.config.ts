import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 15/16: server-side external packages (replaces webpack externals)
  serverExternalPackages: ["canvas", "encoding"],
  // Silence Turbopack warning (default in Next.js 16)
  turbopack: {},
};

export default nextConfig;
