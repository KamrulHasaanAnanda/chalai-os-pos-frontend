"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/icons";

/** The day, written out, over the browser's own date box so the format matches the heading. */
export function DayField({ date, today }: { date: string; today: string }) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const label = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <label className="relative flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 hover:bg-muted">
      <Icon name="calendar" className="size-4 text-muted-foreground" />
      <span className="text-[14px] font-semibold tabular-nums">{label}</span>
      <input
        type="date"
        name="date"
        defaultValue={date}
        max={today}
        aria-label={t("date")}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
