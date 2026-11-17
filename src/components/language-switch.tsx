"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/** The static demo is plain files: no server to render the other language. */
const staticDemo = process.env.CHALAI_STATIC === "1";

/** "বাংলা" in English, "English" in Bangla: each label is written in the language it switches to. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (staticDemo) return null;
  const next = locale === "bn" ? "en" : "bn";
  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-md border px-3 text-[13px] font-semibold transition-colors disabled:opacity-60",
        className,
      )}
    >
      {next === "bn" ? "বাংলা" : "English"}
    </button>
  );
}
