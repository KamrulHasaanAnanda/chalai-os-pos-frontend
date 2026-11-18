import { getTranslations } from "next-intl/server";
import {
  LoadingPage,
  OrderSkeleton,
  PageHeaderSkeleton,
} from "@/components/app/page-skeleton";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton />
      <OrderSkeleton />
    </LoadingPage>
  );
}
