"use client";
// Error boundaries must be Client Components. Shown when the API is unreachable or answers unexpectedly. With no
// internet it points to the offline till, which keeps working from this tablet's saved copy.

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { probe, useOutbox } from "@/lib/offline/outbox";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("error");
  const tCommon = useTranslations("common");
  const { online } = useOutbox();
  useEffect(() => {
    if (process.env.CHALAI_DEMO !== "1") void probe();
  }, []);
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-[22px] font-semibold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{online ? t("body") : t("offlineBody")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {!online && (
          <Link href="/offline" className={buttonVariants({ variant: "default", size: "lg" })}>
            {tCommon("openTill")}
          </Link>
        )}
        <button type="button" onClick={() => retry()} className={buttonVariants({ variant: online ? "default" : "outline", size: "lg" })}>
          {tCommon("retry")}
        </button>
      </div>
    </main>
  );
}
