import { getTranslations } from "next-intl/server";
import {
  ListSkeleton,
  LoadingPage,
  PageHeaderSkeleton,
} from "@/components/app/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton action={true} />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
      <ListSkeleton rows={8} />
    </LoadingPage>
  );
}
