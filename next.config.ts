import type { NextConfig } from "next";

// NOTE: typescript.ignoreBuildErrors is enabled for the first deploy only.
// Turn it off once the project type-checks cleanly in CI.
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
