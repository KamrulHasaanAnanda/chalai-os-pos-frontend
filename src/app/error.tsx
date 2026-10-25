"use client";
// Error boundaries must be Client Components. Shown when the API is unreachable or answers unexpectedly.

import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("error");
  const tCommon = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-[26px] font-extrabold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("body")}</p>
      <button type="button" onClick={() => retry()} className={`${buttonClass({ variant: "accent", size: "lg" })} mt-5`}>
        {tCommon("retry")}
      </button>
    </main>
  );
}
