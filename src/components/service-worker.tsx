"use client";
// Registers the POS service worker (public/sw.js) in production builds, and refreshes its copy of the offline till
// after each online load so the cached page matches the current build.
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || process.env.CHALAI_DEMO === "1" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        const ready = await navigator.serviceWorker.ready;
        if (navigator.onLine) ready.active?.postMessage("cache-offline-till");
      })
      .catch(() => undefined);
  }, []);
  return null;
}
