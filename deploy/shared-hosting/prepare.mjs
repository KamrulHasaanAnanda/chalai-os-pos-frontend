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
const remove = ["src/proxy.ts", "src/app/api", "src/app/(app)/orders/[id]", "src/app/(print)/orders/[id]"];
for (const path of remove) {
  if (!existsSync(path)) {
    console.error(`prepare.mjs: ${path} not found. Update deploy/shared-hosting/prepare.mjs.`);
    process.exit(1);
  }
  rmSync(path, { recursive: true });
}

cpSync("src/demo/routes", "src/app", { recursive: true, force: true });

console.log("prepare.mjs: source ready for static export");
