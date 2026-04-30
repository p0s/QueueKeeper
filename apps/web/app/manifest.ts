import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QueueKeeper",
    short_name: "QueueKeeper",
    description: "Private scout-and-hold procurement with proof-backed micropayments.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1eb",
    theme_color: "#f4f1eb",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any"
      },
      {
        src: "/apple-icon",
        type: "image/png",
        sizes: "180x180"
      }
    ]
  };
}
