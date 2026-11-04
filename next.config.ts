import path from "node:path";
import type { NextConfig } from "next";
import "./src/lib/env";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  sassOptions: {
    // Permite `@use "abstracts" as *;` desde cualquier .scss
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
};

export default nextConfig;
