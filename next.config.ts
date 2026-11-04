import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Each language and the owner panel are separate root layouts, so unknown URLs need one shared 404 page.
    globalNotFound: true,
    // Uploaded reference photos reach server actions in the panel; the public upload route has its own 8 MB limit.
    serverActions: { bodySizeLimit: "9mb" },
  },
  // node:sqlite is built in; sharp ships native code. Neither may be bundled.
  serverExternalPackages: ["sharp"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
