import {
  ListSkeleton,
  LoadingPage,
  PageHeaderSkeleton,
} from "@/components/app/page-skeleton";
import { getTranslations } from "next-intl/server";

export default async function ManageCouponsLoading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton />
      <ListSkeleton rows={5} />
    </LoadingPage>
  );
}
