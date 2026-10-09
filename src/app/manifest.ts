import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.negocio,
    short_name: config.negocio.slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f4",
    theme_color: "#1f6f5c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
