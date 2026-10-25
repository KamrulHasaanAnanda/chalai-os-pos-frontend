import { PosShell } from "@/components/shell";
import { requireStaff } from "@/lib/session";

/** Floor, orders, bills and menu: everyone except the kitchen role. Pages check their own roles too. */
export default async function StaffLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();
  return <PosShell staff={staff}>{children}</PosShell>;
}
