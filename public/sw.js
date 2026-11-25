// Chalai POS service worker (pos-offline and installable-apps specs).
// - Keeps the offline till (/offline) and the app's static files, so the till opens with no internet.
// - Pages are network-first; with no network a page seen before is shown, otherwise the offline till.
// - API calls, route handlers and page data (RSC) are never cached: the server stays the source of truth.

const VERSION = "chalai-pos-v2";
/** With Wi-Fi up and the internet down a page load can hang for a minute; give up sooner and open the till. */
const NAVIGATE_TIMEOUT_MS = 10_000;
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

async function cacheOfflineTill() {
  const cache = await caches.open(SHELL);
  const response = await fetch("/offline", { credentials: "include", cache: "no-store" });
  if (!response.ok || response.redirected) return;
  const html = await response.clone().text();
  await cache.put("/offline", response);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  const statics = await caches.open(STATIC);
  await Promise.all(assets.map((url) => statics.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflineTill().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "cache-offline-till") event.waitUntil(cacheOfflineTill().catch(() => undefined));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC).then((c) => c.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // The request is passed on untouched (its navigate mode and redirects stay as the browser made them).
        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), NAVIGATE_TIMEOUT_MS);
        });
        try {
          return await Promise.race([fetch(request), timeout]);
        } catch {
          const shell = await caches.open(SHELL);
          return (await shell.match("/offline")) ?? Response.error();
        } finally {
          clearTimeout(timer);
        }
      })(),
    );
  }
});
