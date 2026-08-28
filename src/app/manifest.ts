import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Samosa & Co. Shop Manager", short_name: "Shop Manager",
    description: "Fast, auditable daily shop records.", start_url: "/", display: "standalone",
    background_color: "#f4ebd9", theme_color: "#c8672a",
    icons: [{ src: "/shop-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
