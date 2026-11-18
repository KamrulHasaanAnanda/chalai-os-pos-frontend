import { getTranslations } from "next-intl/server";
import {
  LoadingPage,
  PageHeaderSkeleton,
  StatsSkeleton,
  TileGridSkeleton,
} from "@/components/app/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton />
      <Skeleton className="mb-5 h-[58px] w-full rounded-xl" />
      <StatsSkeleton />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="mb-5 flex gap-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          <TileGridSkeleton count={6} />
        </div>
        <Skeleton className="hidden h-64 rounded-xl xl:block" />
      </div>
    </LoadingPage>
  );
}
