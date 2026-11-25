import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
import withSerwistInit from "@serwist/next";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  devIndicators: false,
  turbopack: {},
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));
