import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: frontendRoot,
  // Chỉ còn một redirect: "/" vào Workspace Home. permanent: false -> HTTP 307,
  // browser không cache vĩnh viễn nên có thể đổi đích sau này.
  async redirects() {
    return [{ source: "/", destination: "/workspace", permanent: false }];
  },
};

export default nextConfig;
