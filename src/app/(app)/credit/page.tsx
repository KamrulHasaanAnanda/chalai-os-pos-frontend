import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CreditView } from "@/components/views/credit-view";
import { billRoles, homeFor, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("credit") };
}

/** Customer credit (বাকি): find a customer by phone, see what they owe, take money back. */
export default async function CreditPage() {
  const { user, restaurant } = await requireStaff({ roles: billRoles });
  if (!restaurant.creditEnabled) redirect(homeFor(user.role));
  return <CreditView timeZone={restaurant.timezone} />;
}
