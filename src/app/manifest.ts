import type { MetadataRoute } from "next";

// Same for everyone, so it can be a plain file (the static demo export needs that).
export const dynamic = "force-static";

/** Home-screen install (installable-apps spec): full screen, no browser bar. Served at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chalai OS",
    short_name: "Chalai",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
