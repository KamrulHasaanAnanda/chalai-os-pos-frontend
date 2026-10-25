import { AppHeader } from "@/components/app-header";
import { kitchenRoles, requireStaff } from "@/lib/session";

/** The kitchen screen: dark, full height, readable from across the kitchen on a tablet or a wall TV. */
export default async function KitchenLayout({ children }: LayoutProps<"/kitchen">) {
  const staff = await requireStaff({ roles: kitchenRoles, module: "kitchen" });
  return (
    <div className="min-h-dvh bg-night text-white">
      <AppHeader staff={staff} dark />
      <main>{children}</main>
    </div>
  );
}
