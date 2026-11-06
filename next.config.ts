import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    '/api/reports/website/*/*': ['./public/fonts/Satoshi-Regular.woff2', './public/fonts/Satoshi-Bold.woff2'],
  },
};

export default nextConfig;
