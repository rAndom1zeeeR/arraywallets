import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  outputFileTracingIncludes: {
    "/*": ["./generated/prisma/**/*"],
  },
  transpilePackages: ["@random1ze/ton-api-client"],
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
