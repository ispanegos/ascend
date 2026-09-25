import type { MetadataRoute } from "next";

/** Web app manifest — installable PWA shell (spec §41). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ASCEND",
    short_name: "ASCEND",
    description: "Real progress. Real you. An RPG where the character is your real body.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#091922",
    theme_color: "#091922",
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
