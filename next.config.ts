import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // face-api.js가 서버 사이드에서 canvas를 참조하지 않도록 제외
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "canvas",
        "encoding",
      ];
    }
    return config;
  },
};

export default nextConfig;
