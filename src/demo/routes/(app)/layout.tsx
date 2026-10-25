import type { ReactNode } from "react";
import { DemoStaffLayout } from "@/demo/pages";

// Demo build only: copied over the server layout by deploy/shared-hosting/prepare.mjs.
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <DemoStaffLayout>{children}</DemoStaffLayout>;
}
