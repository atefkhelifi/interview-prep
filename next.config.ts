import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Study sheets and the HR guide are read from disk; make sure serverless functions ship them.
  outputFileTracingIncludes: {
    "/study/[tech]": ["./content/study/**"],
    "/hr": ["./content/hr/**"],
  },
  experimental: {
    // CV uploads on /cv (4 MB PDFs + form overhead), under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
