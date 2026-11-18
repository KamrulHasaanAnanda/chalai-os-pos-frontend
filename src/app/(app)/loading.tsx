import { getTranslations } from "next-intl/server";
import {
  ListSkeleton,
  LoadingPage,
  PageHeaderSkeleton,
} from "@/components/app/page-skeleton";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton />
      <ListSkeleton />
    </LoadingPage>
  );
}
