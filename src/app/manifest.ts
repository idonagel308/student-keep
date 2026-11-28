import type { MetadataRoute } from "next";

/** Home-screen install on Android (iOS uses apple-icon.png). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Student Keep",
    short_name: "Student Keep",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#f3f2f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
