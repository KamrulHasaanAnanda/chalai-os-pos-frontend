import Link from "next/link";
import { useTranslations } from "next-intl";
import { openOrder } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { tableStatusStyle } from "@/components/status";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Floor, FloorTable, TableStatus, User } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, minutesSince } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { billRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const columns = 5;
const rows = 8;
const statuses: TableStatus[] = ["free", "occupied", "needs_approval", "food_ready", "bill_requested"];

/** The floor plan: one tile per table, coloured by status. A free table opens an order, a busy one goes to it. */
export function FloorView({ floor, user, error }: { floor: Floor; user: User; error: ErrorReader }) {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const tRoles = useTranslations("roles");
  const receipt = billRoles.includes(user.role) ? error.param("receipt") : undefined;

  const all = floor.areas.flatMap((a) => a.tables);
  const count = (status: TableStatus) => all.filter((table) => table.status === status).length;
  const area = floor.areas.find((a) => a.id === error.param("area")) ?? floor.areas[0];

  const counters: { status: TableStatus; label: string }[] = [
    { status: "needs_approval", label: t("counters.needsApproval") },
    { status: "food_ready", label: t("counters.foodReady") },
    { status: "bill_requested", label: t("counters.billRequested") },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <PageHeader
        title={t("title")}
        description={
          error.param("welcome") === "1"
            ? t("welcome", { name: user.name, role: tRoles(user.role) })
            : t("summary", { busy: all.length - count("free"), total: all.length })
        }
        actions={
          <>
            {receipt && (
              <ButtonLink href={orderHref(receipt, "receipt")} variant="secondary">
                <Icon name="printer" />
                {t("printLast")}
              </ButtonLink>
            )}
            <form action={openOrder}>
              <SubmitButton variant="secondary">
                <Icon name="bag" />
                {t("takeaway")}
              </SubmitButton>
            </form>
          </>
        }
      />

      {error.message && <Notice>{error.message}</Notice>}

      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {counters.map(({ status, label }) => {
          const n = count(status);
          const style = tableStatusStyle[status];
          return (
            <li
              key={status}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4",
                n > 0 ? style.tile : "border border-line bg-white text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "hidden size-10 shrink-0 items-center justify-center rounded-full sm:flex",
                  n > 0 ? "bg-white/25" : "bg-[#f6eedb]",
                )}
              >
                <Icon name={style.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[24px] leading-none font-extrabold tabular-nums">{n}</span>
                <span className="mt-1 block text-[12.5px] leading-tight font-semibold sm:text-[14px]">{label}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {floor.areas.length > 1 ? (
          <Segmented
            label={t("areas")}
            items={floor.areas.map((a) => ({
              href: `/floor?area=${a.id}`,
              label: a.name,
              active: a.id === area?.id,
              count: a.tables.filter((table) => table.status !== "free").length,
            }))}
          />
        ) : (
          <h2 className="text-[18px] font-bold">{area?.name}</h2>
        )}
        <ul aria-label={t("legend")} className="flex flex-wrap gap-x-4 gap-y-2">
          {statuses.map((status) => (
            <li key={status} className="flex items-center gap-1.5 text-[13px] font-medium text-[#574843]">
              <span aria-hidden className={cn("size-3.5 rounded-[5px]", tableStatusStyle[status].swatch)} />
              {tStatus(status)}
            </li>
          ))}
        </ul>
      </div>

      {!area ? (
        <EmptyState icon="grid" title={t("noTablesTitle")} body={t("noTables")} className="rounded-2xl border border-line bg-white" />
      ) : (
        <AreaGrid tables={area.tables} />
      )}
    </div>
  );
}

function AreaGrid({ tables }: { tables: FloorTable[] }) {
  const t = useTranslations("floor");
  const placed = tables.filter((table) => table.gridX !== null && table.gridY !== null);
  const unplaced = tables.filter((table) => table.gridX === null || table.gridY === null);
  const usedRows = Math.min(rows, Math.max(1, ...placed.map((table) => (table.gridY ?? 0) + 1)));
  const at = (x: number, y: number) => placed.find((table) => table.gridX === x && table.gridY === y);

  return (
    <div className="space-y-4">
      {placed.length > 0 && (
        <div
          className="grid gap-2 rounded-[20px] border border-line bg-[#f6efe1] p-2 sm:gap-3 sm:p-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: usedRows * columns }, (_, i) => {
            const table = at(i % columns, Math.floor(i / columns));
            return table ? (
              <TableTile key={table.id} table={table} />
            ) : (
              <div key={i} aria-hidden className="min-h-[72px] rounded-2xl border border-dashed border-[#e3d3b3]/70 sm:min-h-[112px]" />
            );
          })}
        </div>
      )}
      {unplaced.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-muted-foreground">{t("unplaced")}</h3>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
            {unplaced.map((table) => (
              <TableTile key={table.id} table={table} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableTile({ table }: { table: FloorTable }) {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const style = tableStatusStyle[table.status];
  const label = t("tableAria", { table: table.label, status: tStatus(table.status) });
  const tile = cn(
    "relative flex min-h-[72px] w-full flex-col justify-between rounded-2xl p-2 text-left transition-[transform,box-shadow,border-color] duration-150 ease-out active:scale-[0.97] sm:min-h-[112px] sm:p-3",
    style.tile,
  );
  const body = (
    <>
      <span className="flex items-start justify-between gap-1">
        <span className="truncate text-[20px] leading-none font-extrabold tracking-[-0.02em] sm:text-[28px]" title={table.label}>
          {table.label}
        </span>
        {table.status === "needs_approval" ? (
          <span aria-hidden className="pulse-dot mt-1 size-2.5 shrink-0 rounded-full bg-brand text-brand" />
        ) : (
          <Icon name={style.icon} className={cn("size-4 shrink-0 sm:size-5", style.sub)} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] leading-tight font-bold sm:text-[13px]">{tStatus(table.status)}</span>
        <span className={cn("hidden text-[12.5px] font-medium tabular-nums sm:block", style.sub)}>
          {table.order ? (
            <>
              {formatTaka(table.order.totalTaka)} · {t("minutes", { n: minutesSince(table.order.openedAt) })}
            </>
          ) : (
            t("seats", { n: table.seats })
          )}
        </span>
      </span>
    </>
  );

  if (table.order) {
    return (
      <Link href={orderHref(table.order.id)} aria-label={label} className={tile}>
        {body}
      </Link>
    );
  }
  return (
    <form action={openOrder} className="contents">
      <input type="hidden" name="tableId" value={table.id} />
      <button type="submit" aria-label={label} className={tile}>
        {body}
      </button>
    </form>
  );
}
