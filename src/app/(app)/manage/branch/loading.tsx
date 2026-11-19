import {
  LoadingPage,
  PageHeaderSkeleton,
} from "@/components/app/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function ManageBranchLoading() {
  const t = await getTranslations("common");
  return (
    <LoadingPage label={t("loading")}>
      <PageHeaderSkeleton />
      <div className="mt-4 grid max-w-xl gap-4 rounded-xl border bg-card p-5 shadow-xs">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-28" />
      </div>
    </LoadingPage>
  );
}
