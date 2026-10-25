import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// CHALAI_DEMO=1: frontend-only demo (src/demo), the backend is never called. The server action modules and the live
// connection are swapped for browser versions that keep a sample restaurant in localStorage. CHALAI_STATIC_EXPORT=1 on
// top builds it as plain files for shared hosting (out/, see deploy/shared-hosting and .github/workflows/deploy.yml).
const demo = process.env.CHALAI_DEMO === "1";
const staticExport = demo && process.env.CHALAI_STATIC_EXPORT === "1";

const demoAliases = {
  "@/actions/auth": "./src/demo/actions/auth.ts",
  "@/actions/kitchen": "./src/demo/actions/kitchen.ts",
  "@/actions/menu": "./src/demo/actions/menu.ts",
  "@/actions/orders": "./src/demo/actions/orders.ts",
  "@/components/live-sync": "./src/demo/live-sync.tsx",
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(staticExport ? { output: "export", trailingSlash: true } : {}),
  // Read by the browser code too (lib/paths.ts): the demo build has different order URLs.
  env: { CHALAI_DEMO: demo ? "1" : "0" },
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    ...(demo ? { resolveAlias: demoAliases } : {}),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
