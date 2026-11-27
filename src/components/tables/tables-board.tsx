"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { TableCard } from "@/components/tables/table-card";
import { useElapsedTick } from "@/components/tables/use-elapsed-tick";
import type { FloorTable } from "@/lib/api/types";
import {
  DENSITY_MIN,
  STATUS_SORT,
  type TableSort,
} from "@/lib/table-card-config";
import { cn } from "@/lib/utils";
import { useTablesCardsPrefs } from "@/components/tables/tables-cards-context";

const MAX_TILES = 240;

type Show = "all" | "busy" | "free";

type AreaSlice = { id: string; name: string; tables: FloorTable[] };

function filterTables(tables: FloorTable[], query: string, show: Show) {
  const q = query.trim().toLowerCase();
  return tables.filter(
    (table) =>
      (!q || table.label.toLowerCase().includes(q)) &&
      (show === "all" ||
        (show === "busy" ? table.status !== "free" : table.status === "free")),
  );
}

function sortTables(tables: FloorTable[], sort: TableSort) {
  const copy = [...tables];
  if (sort === "label") {
    copy.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
    return copy;
  }
  copy.sort((a, b) => {
    const d = STATUS_SORT[a.status] - STATUS_SORT[b.status];
    if (d !== 0) return d;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });
  return copy;
}

export function TablesBoard({
  areas,
  query,
  show,
  scrollToAreaId,
}: {
  areas: AreaSlice[];
  query: string;
  show: Show;
  scrollToAreaId?: string | null;
}) {
  const t = useTranslations("floor");
  const tCard = useTranslations("floor.tableCard");
  const { density, sort } = useTablesCardsPrefs();
  const nowMs = useElapsedTick();

  const sections = useMemo(() => {
    const out: { area: AreaSlice; matches: ReturnType<typeof sortTables>; shown: ReturnType<typeof sortTables> }[] = [];
    let remaining = MAX_TILES;
    for (const area of areas) {
      const matches = sortTables(filterTables(area.tables, query, show), sort);
      const shown = matches.slice(0, remaining);
      remaining -= shown.length;
      if (shown.length > 0 || matches.length > 0) out.push({ area, matches, shown });
    }
    return out;
  }, [areas, query, show, sort, density]);

  const totalMatches = sections.reduce((n, s) => n + s.matches.length, 0);
  const totalShown = sections.reduce((n, s) => n + s.shown.length, 0);

  useEffect(() => {
    if (!scrollToAreaId) return;
    const el = document.getElementById(`area-${scrollToAreaId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToAreaId]);

  if (totalShown === 0) {
    return (
      <p className="rounded-xl border border-dashed py-12 text-center text-[14px] text-muted-foreground">
        {t("noMatch")}
      </p>
    );
  }

  const multi = areas.length > 1;
  const gridStyle = { gridTemplateColumns: `repeat(auto-fill, ${DENSITY_MIN[density]})` };

  return (
    <div className="space-y-6">
      {sections.map(({ area, matches, shown }) => {
        const busy = area.tables.filter((x) => x.status !== "free").length;
        if (shown.length === 0) return null;
        return (
          <section key={area.id} id={`area-${area.id}`} className="scroll-mt-24">
            {multi ? (
              <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-zinc-800">
                {tCard("section", {
                  name: area.name,
                  busy,
                  total: area.tables.length,
                })}
              </h2>
            ) : null}
            <ul
              className={cn(
                "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
              )}
              style={gridStyle}
            >
              {shown.map((table) => {
                const busyCard = table.status !== "free";
                return (
                  <li
                    key={table.id}
                    className={cn(busyCard && "col-span-2 max-sm:col-span-2")}
                  >
                    <TableCard
                      table={table}
                      variant={busyCard ? "large" : "compact"}
                      nowMs={nowMs}
                      back="/tables"
                    />
                  </li>
                );
              })}
            </ul>
            {matches.length > shown.length ? (
              <p className="mt-2 text-[13px] text-muted-foreground">
                {t("capped", { shown: shown.length, total: matches.length })}
              </p>
            ) : null}
          </section>
        );
      })}
      {totalMatches > totalShown ? (
        <p className="text-center text-[13px] text-muted-foreground">
          {t("capped", { shown: totalShown, total: totalMatches })}
        </p>
      ) : null}
    </div>
  );
}