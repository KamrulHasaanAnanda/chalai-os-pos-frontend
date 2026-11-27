// Readies the repo for the static demo build (plain files for shared hosting, see .github/workflows/deploy.yml).
// CI only: it deletes and overwrites source files in place, so never run it in your working copy.
// Static export can't run anything on a server, so the server-only parts go and the browser-only demo screens
// (src/demo/routes, same paths as src/app) take the place of the server pages. Any server page left behind fails the
// build (it reads cookies), so a new page without a demo version stops the deploy instead of shipping a broken site.
import { cpSync, existsSync, rmSync } from "node:fs";

if (!process.env.CI) {
  console.error("prepare.mjs rewrites source files. It only runs in CI (set CI=1 in a throwaway copy).");
  process.exit(1);
}

// No proxy, route handlers or per-order pages in a static build. The demo's order screens take ?id= (src/lib/paths.ts).
const remove = [
  "src/proxy.ts",
  "src/app/api",
  "src/app/(app)/orders/[id]",
  "src/app/(print)/orders/[id]",
  // KOT printing needs the API; the demo has no kitchen printer.
  "src/app/(print)/kot",
  "src/app/offline",
  // Server pages with no demo substitute (they pull `use server` manage / API loaders).
  "src/app/(app)/manage",
  "src/app/(app)/reservations",
  "src/app/(app)/stock",
  "src/app/(app)/credit",
];
for (const path of remove) {
  if (!existsSync(path)) {
    console.error(`prepare.mjs: ${path} not found. Update deploy/shared-hosting/prepare.mjs.`);
    process.exit(1);
  }
  rmSync(path, { recursive: true });
}

cpSync("src/demo/routes", "src/app", { recursive: true, force: true });

// Static export rejects any `use server` module. Swap in browser demo action files (same exports, no directive).
const actionSwap = {
  "src/actions/auth.ts": "src/demo/actions/auth.ts",
  "src/actions/kitchen.ts": "src/demo/actions/kitchen.ts",
  "src/actions/menu.ts": "src/demo/actions/menu.ts",
  "src/actions/orders.ts": "src/demo/actions/orders.ts",
  "src/actions/assistant.ts": "src/demo/actions/assistant.ts",
  "src/actions/shifts.ts": "src/demo/actions/shifts.ts",
  "src/actions/attendance.ts": "src/demo/actions/attendance.ts",
  "src/actions/manage.ts": "src/demo/actions/manage.ts",
  "src/actions/reservations.ts": "src/demo/actions/reservations.ts",
  "src/actions/stock.ts": "src/demo/actions/stock.ts",
};
for (const [dest, src] of Object.entries(actionSwap)) {
  if (!existsSync(src)) {
    console.error(`prepare.mjs: missing ${src}`);
    process.exit(1);
  }
  cpSync(src, dest, { force: true });
}

console.log("prepare.mjs: source ready for static export");