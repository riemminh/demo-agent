import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: frontendRoot,
  // URL cũ (trước refactor 8 demo) vẫn mở đúng demo. permanent: false -> HTTP 307,
  // browser không cache vĩnh viễn nên có thể đổi đích sau này.
  async redirects() {
    return [
      { source: "/", destination: "/workspace", permanent: false },
      { source: "/playground", destination: "/workspace", permanent: false },
      { source: "/approval", destination: "/runtime?scenario=approval", permanent: false },
      { source: "/lessons/messages-api", destination: "/claude-api", permanent: false },
    ];
  },
};

export default nextConfig;
