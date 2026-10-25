import { KitchenShell } from "@/components/shell";
import { kitchenRoles, requireStaff } from "@/lib/session";

/** Kitchen staff, plus owners and managers checking on the kitchen. */
export default async function KitchenLayout({ children }: LayoutProps<"/kitchen">) {
  const staff = await requireStaff({ roles: kitchenRoles, module: "kitchen" });
  return <KitchenShell staff={staff}>{children}</KitchenShell>;
}
