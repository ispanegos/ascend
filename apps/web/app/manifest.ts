import type { MetadataRoute } from "next";

/** Web app manifest — installable PWA shell (spec §41). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ASCEND",
    short_name: "ASCEND",
    description: "Personal athletic progression. There is always another summit.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1e8",
    theme_color: "#f4f1e8",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
