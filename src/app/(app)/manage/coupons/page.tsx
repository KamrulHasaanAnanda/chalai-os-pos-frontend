import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ManageCouponsView } from "@/components/views/manage-coupons-view";
import { load, requireManage } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("coupons") };
}

export default async function ManageCouponsPage() {
  await requireManage("coupons");
  const coupons = await load((api) => api.manageCoupons());
  return <ManageCouponsView coupons={coupons} />;
}
