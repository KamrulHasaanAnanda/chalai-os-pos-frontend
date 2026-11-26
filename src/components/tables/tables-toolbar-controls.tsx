"use client";

import { useTranslations } from "next-intl";
import { useTablesCardsPrefs } from "@/components/tables/tables-cards-context";
import { type TableDensity, type TableSort } from "@/lib/table-card-config";
import { cn } from "@/lib/utils";

export function TablesToolbarControls() {
  const t = useTranslations("floor.tableCard");
  const { density, sort, setDensity, setSort } = useTablesCardsPrefs();

  const pickDensity = (next: TableDensity) => setDensity(next);
  const pickSort = (next: TableSort) => setSort(next);

  const segment = (active: boolean) =>
    cn(
      "flex h-8 min-h-11 items-center rounded-md px-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors sm:min-h-8",
      active
        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5"
        : "text-zinc-600 hover:text-zinc-900",
    );

  return (
  <>
      <nav
        aria-label={t("densityLabel")}
        className="flex gap-1 rounded-lg bg-zinc-100 p-1"
      >
        {(
          [
            ["compact", t("density.compact")],
            ["comfortable", t("density.comfortable")],
            ["large", t("density.large")],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={density === value}
            className={segment(density === value)}
            onClick={() => pickDensity(value)}
          >
            {text}
          </button>
        ))}
      </nav>
      <nav
        aria-label={t("sortLabel")}
        className="flex gap-1 rounded-lg bg-zinc-100 p-1"
      >
        {(
          [
            ["busy", t("sort.busy")],
            ["label", t("sort.label")],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={sort === value}
            className={segment(sort === value)}
            onClick={() => pickSort(value)}
          >
            {text}
          </button>
        ))}
      </nav>
    </>
  );
}