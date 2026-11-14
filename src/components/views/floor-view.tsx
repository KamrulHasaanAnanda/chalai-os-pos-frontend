import Link from "next/link";
import { useTranslations } from "next-intl";
import { openOrder } from "@/actions/orders";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { Notice } from "@/components/app/field";
import { SubmitButton } from "@/components/app/submit-button";
import { SessionBar } from "@/components/session-bar";
import type { Floor, FloorTable, TableStatus, User } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, minutesSince } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { billRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const columns = 5;
const rows = 8;

/** One colour per table state: solid for the badge, soft for the tile, so the floor reads from across the room. */
const TONES: Record<
  TableStatus,
  { icon: IconName; solid: string; tile: string; text: string }
> = {
  free: {
    icon: "plus",
    solid: "bg-zinc-200 text-zinc-600",
    tile: "border-2 border-dashed border-zinc-300 bg-card/60 hover:border-zinc-900 hover:bg-card",
    text: "text-muted-foreground",
  },
  occupied: {
    icon: "users",
    solid: "bg-zinc-900 text-white",
    tile: "border-2 border-zinc-900 bg-card hover:bg-zinc-50",
    text: "text-zinc-900",
  },
  needs_approval: {
    icon: "bell",
    solid: "bg-orange-500 text-white",
    tile: "border-2 border-orange-500 bg-orange-50 hover:bg-orange-100",
    text: "text-orange-700",
  },
  food_ready: {
    icon: "checkCircle",
    solid: "bg-emerald-600 text-white",
    tile: "border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100",
    text: "text-emerald-700",
  },
  bill_requested: {
    icon: "receipt",
    solid: "bg-blue-600 text-white",
    tile: "border-2 border-blue-600 bg-blue-50 hover:bg-blue-100",
    text: "text-blue-700",
  },
};

/** The floor plan: one tile per table, coloured by status. A free table opens an order, a busy one goes to it. */
export function FloorView({
  floor,
  user,
  error,
}: {
  floor: Floor;
  user: User;
  error: ErrorReader;
}) {
  const t = useTranslations("floor");
  const tRoles = useTranslations("roles");
  const receipt = billRoles.includes(user.role)
    ? error.param("receipt")
    : undefined;

  const all = floor.areas.flatMap((a) => a.tables);
  const count = (status: TableStatus) =>
    all.filter((table) => table.status === status).length;
  const area =
    floor.areas.find((a) => a.id === error.param("area")) ?? floor.areas[0];
  const busy = all.filter((table) => table.status !== "free");
  const openTaka = busy.reduce(
    (sum, table) => sum + (table.order?.totalTaka ?? 0),
    0,
  );
  const seatsUsed = busy.reduce((sum, table) => sum + table.seats, 0);
  const seatsAll = all.reduce((sum, table) => sum + table.seats, 0);
  const busyShare = all.length
    ? Math.round((busy.length / all.length) * 100)
    : 0;

  const counters: { status: TableStatus; label: string; hint: string }[] = [
    {
      status: "needs_approval",
      label: t("counters.needsApproval"),
      hint: t("counters.needsApprovalHint"),
    },
    {
      status: "food_ready",
      label: t("counters.foodReady"),
      hint: t("counters.foodReadyHint"),
    },
    {
      status: "bill_requested",
      label: t("counters.billRequested"),
      hint: t("counters.billRequestedHint"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* Dark summary: who's logged in, how full the floor is, and the main action. */}
      <section className="relative overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">
              {t("title")}
            </h1>
            <p className="mt-1 text-[14px] text-zinc-400">
              {error.param("welcome") === "1"
                ? t("welcome", { name: user.name, role: tRoles(user.role) })
                : t("summary", { busy: busy.length, total: all.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {receipt && (
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-white/20 bg-white/5 px-4 font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={orderHref(receipt, "receipt")}>
                  <Icon name="printer" />
                  {t("printLast")}
                </Link>
              </Button>
            )}
            <form action={openOrder}>
              <SubmitButton className="h-11 gap-0 rounded-xl bg-white pr-4 pl-1.5 text-[14px] font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100">
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white"
                >
                  <Icon name="bag" className="size-4" />
                </span>
                {t("takeaway")}
              </SubmitButton>
            </form>
          </div>
        </div>

        <div className="relative mt-5">
          <SessionBar userId={user.id} userName={user.name} />
        </div>

        <dl className="relative mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <HeroStat
            label={t("stats.busy")}
            value={`${busy.length}/${all.length}`}
          >
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-orange-500"
                style={{ width: `${busyShare}%` }}
              />
            </span>
          </HeroStat>
          <HeroStat label={t("stats.open")} value={formatTaka(openTaka)} />
          <HeroStat
            label={t("stats.seats")}
            value={`${seatsUsed}/${seatsAll}`}
          />
        </dl>
      </section>

      {error.message && <Notice>{error.message}</Notice>}

      {/* What needs someone now. QR approvals and bill requests are handled on Incoming; food ready is on each table. */}
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {counters.map(({ status, label, hint }) => {
          const n = count(status);
          const tone = TONES[status];
          const linked = n > 0 && status !== "food_ready";
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11",
                  n > 0 ? tone.solid : "bg-zinc-100 text-zinc-400",
                )}
              >
                <Icon name={tone.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[24px] leading-none font-bold tabular-nums sm:text-[28px]",
                    n === 0 && "text-zinc-400",
                  )}
                >
                  {n}
                </span>
                <span className="mt-1 block text-[12.5px] leading-tight font-semibold sm:text-[13.5px]">
                  {label}
                </span>
                <span className="hidden text-[12.5px] text-muted-foreground lg:block">
                  {hint}
                </span>
              </span>
              {linked && (
                <Icon
                  name="go"
                  className="ml-auto hidden size-4 shrink-0 text-muted-foreground sm:block"
                />
              )}
            </>
          );
          const box = cn(
            "flex h-full flex-col gap-2.5 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4",
            n > 0 &&
              status === "needs_approval" &&
              "border-orange-300 ring-2 ring-orange-500/15",
          );
          return (
            <li key={status}>
              {linked ? (
                <Link
                  href="/incoming"
                  className={cn(
                    box,
                    "transition hover:border-zinc-900 hover:shadow-sm",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-2xl border bg-card p-3 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {floor.areas.length > 1 ? (
            <nav aria-label={t("areas")} className="max-w-full overflow-x-auto">
              <ul className="inline-flex gap-1.5">
                {floor.areas.map((a) => {
                  const active = a.id === area?.id;
                  const n = a.tables.filter(
                    (table) => table.status !== "free",
                  ).length;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/floor?area=${a.id}`}
                        scroll={false}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center gap-2 rounded-lg px-3.5 text-[14px] font-semibold whitespace-nowrap transition-colors",
                          active
                            ? "bg-zinc-900 text-white"
                            : "bg-muted text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900",
                        )}
                      >
                        {a.name}
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[11.5px] leading-none tabular-nums",
                            active
                              ? "bg-white/15 text-white"
                              : "bg-white text-zinc-600",
                          )}
                        >
                          {t("areaBusy", { busy: n, total: a.tables.length })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : (
            <h2 className="text-[17px] font-bold">{area?.name}</h2>
          )}
          <Legend />
        </div>

        {!area ? (
          <EmptyState
            icon="grid"
            title={t("noTablesTitle")}
            body={t("noTables")}
          />
        ) : (
          <AreaGrid tables={area.tables} />
        )}
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white/5 p-3 ring-1 ring-white/10 sm:p-4">
      <dt className="truncate text-[11.5px] font-semibold tracking-wide text-zinc-400 uppercase sm:text-[12px]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[20px] leading-tight font-bold tabular-nums sm:text-[26px]">
        {value}
      </dd>
      {children}
    </div>
  );
}

function Legend() {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const order: TableStatus[] = [
    "free",
    "occupied",
    "needs_approval",
    "food_ready",
    "bill_requested",
  ];
  return (
    <ul
      aria-label={t("legend")}
      className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] font-medium text-zinc-600"
    >
      {order.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-3 rounded-[4px]",
              status === "free"
                ? "border-2 border-dashed border-zinc-400"
                : TONES[status].solid,
            )}
          />
          {tStatus(status)}
        </li>
      ))}
    </ul>
  );
}

function AreaGrid({ tables }: { tables: FloorTable[] }) {
  const t = useTranslations("floor");
  const placed = tables.filter(
    (table) => table.gridX !== null && table.gridY !== null,
  );
  const unplaced = tables.filter(
    (table) => table.gridX === null || table.gridY === null,
  );
  // Only rows that have a table: an empty row in the plan is just an aisle, not worth a row of blank boxes.
  const usedRows = [...new Set(placed.map((table) => table.gridY ?? 0))]
    .filter((y) => y < rows)
    .sort((a, b) => a - b);
  const at = (x: number, y: number) =>
    placed.find((table) => table.gridX === x && table.gridY === y);

  return (
    <div className="space-y-4">
      {placed.length > 0 && (
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {usedRows
            .flatMap((y) =>
              Array.from({ length: columns }, (_, x) => ({ x, y })),
            )
            .map(({ x, y }, i) => {
              const table = at(x, y);
              return table ? (
                <TableTile key={table.id} table={table} />
              ) : (
                <div key={i} aria-hidden />
              );
            })}
        </div>
      )}
      {unplaced.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-muted-foreground">
            {t("unplaced")}
          </h3>
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
  const tone = TONES[table.status];
  const free = table.status === "free";
  const label = t("tableAria", {
    table: table.label,
    status: tStatus(table.status),
  });
  const tile = cn(
    "group relative flex min-h-[88px] w-full flex-col justify-between gap-2 rounded-xl p-2 text-left transition sm:min-h-[124px] sm:p-3.5",
    tone.tile,
    !free && "shadow-sm",
  );
  const minutes = table.order ? minutesSince(table.order.openedAt) : 0;
  const time =
    minutes < 60
      ? t("minutes", { n: minutes })
      : t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });

  const body = (
    <>
      <span className="flex items-start justify-between gap-1.5">
        <span
          className={cn(
            "flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-[17px] leading-none font-bold sm:h-11 sm:min-w-11 sm:text-[20px]",
            free
              ? "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white"
              : tone.solid,
          )}
          title={table.label}
        >
          <span className="truncate">{table.label}</span>
        </span>
        {table.order ? (
          <span className="hidden text-[15px] font-bold tabular-nums sm:block">
            {formatTaka(table.order.totalTaka)}
          </span>
        ) : (
          <span className="hidden items-center gap-1 text-[12.5px] font-medium text-muted-foreground sm:flex">
            <Icon name="seat" className="size-3.5" />
            {table.seats}
          </span>
        )}
      </span>
      {free ? (
        <span className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground sm:text-[13px]">
          <span className="truncate">{tStatus("free")}</span>
          <span className="ml-auto hidden items-center gap-0.5 font-semibold text-zinc-900 opacity-0 transition group-hover:opacity-100 sm:flex">
            <Icon name="plus" className="size-3.5" />
            {t("open")}
          </span>
        </span>
      ) : (
        <span className="space-y-0.5">
          {table.order && (
            <span className="block text-[13px] font-bold tabular-nums sm:hidden">
              {formatTaka(table.order.totalTaka)}
            </span>
          )}
          <span className="flex items-center justify-between gap-1.5 text-[12px] sm:text-[13px]">
            <span
              className={cn(
                "flex min-w-0 items-center gap-1 truncate font-bold",
                tone.text,
              )}
            >
              <Icon
                name={tone.icon}
                className={cn(
                  "hidden size-3.5 shrink-0 sm:block",
                  table.status === "needs_approval" && "animate-pulse",
                )}
              />
              <span className="truncate">{tStatus(table.status)}</span>
            </span>
            {table.order && (
              <span className="hidden shrink-0 items-center gap-1 font-medium text-muted-foreground tabular-nums sm:flex">
                <Icon name="clock" className="size-3.5" />
                {time}
              </span>
            )}
          </span>
        </span>
      )}
    </>
  );

  if (table.order) {
    return (
      <Link
        href={orderHref(table.order.id)}
        aria-label={label}
        className={tile}
      >
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
