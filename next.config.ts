import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las fotos de facturas y capturas llegan como FormData a /api/leer.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
