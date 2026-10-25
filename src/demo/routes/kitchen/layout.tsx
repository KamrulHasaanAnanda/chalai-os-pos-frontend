import type { ReactNode } from "react";
import { DemoKitchenLayout } from "@/demo/pages";

// Demo build only: copied over the server layout by deploy/shared-hosting/prepare.mjs.
export default function KitchenLayout({ children }: { children: ReactNode }) {
  return <DemoKitchenLayout>{children}</DemoKitchenLayout>;
}
