import path from "node:path";
import type { NextConfig } from "next";
import "./src/lib/env";

const nextConfig: NextConfig = {
  // The build leaves in .next/standalone only what the server needs to run, for a light
  // production image (see Dockerfile).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  sassOptions: {
    // Permite `@use "abstracts" as *;` desde cualquier .scss
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
};

export default nextConfig;
