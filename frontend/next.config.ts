import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The backend is a separate Express process (default :20180). Nothing is proxied
  // through Next — the browser talks to it directly via NEXT_PUBLIC_API_URL so that
  // SSE streaming from /api/chat is not buffered by an intermediate Next handler.
};

export default nextConfig;
