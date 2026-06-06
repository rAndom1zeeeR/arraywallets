import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  outputFileTracingIncludes: {
    "/*": ["./generated/prisma/**/*"],
  },
  transpilePackages: [
    "@random1ze/ton-api-client",
    "@ston-fi/omniston-sdk",
    "@ston-fi/omniston-sdk-react",
    "@ston-fi/api",
    "@reown/appkit",
    "@reown/appkit-adapter-wagmi",
    "wagmi",
    "viem",
  ],
  turbopack: {},
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@ton/core": require.resolve("@ton/core"),
    };
    return config;
  },
};

export default nextConfig;
