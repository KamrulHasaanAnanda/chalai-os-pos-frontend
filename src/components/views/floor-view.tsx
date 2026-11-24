import Link from "next/link";
import { useTranslations } from "next-intl";
import { AttendanceBar } from "@/components/attendance-bar";
import { openOrder } from "@/actions/orders";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { Notice } from "@/components/app/field";
import { SubmitButton } from "@/components/app/submit-button";
import { SessionBar } from "@/components/session-bar";
import { FullscreenButton } from "@/components/fullscreen-button";
import type {
  Floor,
  FloorReservation,
  FloorTable,
  TableStatus,
  User,
} from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime, hasStarted, minutesSince } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { TableSceneView } from "@/components/views/table-scene-view";
import { billRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

/** The most tiles drawn at once; past it, search or the busy/free filter narrows the list. */
const MAX_TILES = 240;
type Show = "all" | "busy" | "free";
type Layout = "cards" | "3d";

/** One look per table state: the card, its status pill and the legend swatch. */
const TONES: Record<
  TableStatus,
  { icon: IconName; tile: string; pill: string; swatch: string }
> = {
  free: {
    icon: "plus",
    tile: "border-border bg-white shadow-xs hover:border-select hover:shadow-md",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset",
    swatch: "bg-white ring-1 ring-zinc-300",
  },
  occupied: {
    icon: "users",
    tile: "border-zinc-900 bg-zinc-900 text-white shadow-sm hover:bg-zinc-800",
    pill: "bg-white/15 text-white",
    swatch: "bg-zinc-900",
  },
  needs_approval: {
    icon: "bell",
    tile: "border-orange-400 bg-orange-50 shadow-sm hover:bg-orange-100",
    pill: "bg-orange-500 text-white",
    swatch: "bg-orange-500",
  },
  food_ready: {
    icon: "checkCircle",
    tile: "border-emerald-500 bg-emerald-50 shadow-sm hover:bg-emerald-100",
    pill: "bg-emerald-600 text-white",
    swatch: "bg-emerald-600",
  },
  bill_requested: {
    icon: "receipt",
    tile: "border-blue-500 bg-blue-50 shadow-sm hover:bg-blue-100",
    pill: "bg-blue-600 text-white",
    swatch: "bg-blue-600",
  },
};

/** The floor plan: one tile per table, coloured by status. A free table opens an order, a busy one goes to it. */
export function FloorView({
  floor,
  user,
  timeZone,
  error,
}: {
  floor: Floor;
  user: User;
  /** Missing in the demo, which has no attendance. */
  timeZone?: string;
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
  const busy = all.filter((table) => table.status !== "free");
  const openTaka = busy.reduce(
    (sum, table) => sum + (table.order?.totalTaka ?? 0),
    0,
  );
  const seatsUsed = busy.reduce((sum, table) => sum + table.seats, 0);
  const seatsAll = all.reduce((sum, table) => sum + table.seats, 0);
  const reservations = floor.reservations ?? [];
  const bookedSeats = reservations.reduce((sum, r) => sum + r.partySize, 0);
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
      {/* Title row like the owner app: icon tile, title and summary; actions on the right. */}
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"
          >
            <Icon name="grid" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight sm:text-[24px]">
              {t("title")}
            </h1>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              {error.param("welcome") === "1"
                ? t("welcome", { name: user.name, role: tRoles(user.role) })
                : t("summary", { busy: busy.length, total: all.length })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {receipt && (
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-lg px-4 font-semibold"
            >
              <Link href={orderHref(receipt, "receipt")}>
                <Icon name="printer" />
                {t("printLast")}
              </Link>
            </Button>
          )}
          <form action={openOrder}>
            <SubmitButton className="h-10 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
              <Icon name="bag" className="size-4" />
              {t("takeaway")}
            </SubmitButton>
          </form>
        </div>
      </header>

      <SessionBar userId={user.id} userName={user.name} canRecordExpense={user.role === "owner" || user.role === "manager"} />
      {timeZone && <AttendanceBar isStaff={user.role !== "owner"} canGiveAdvance={user.role === "owner" || user.role === "manager"} timeZone={timeZone} />}

      {error.message && <Notice>{error.message}</Notice>}

      {/* How full the floor is: four big numbers. */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon="seat"
          tone="bg-violet-100 text-violet-700"
          label={t("stats.busy")}
          value={`${busy.length}/${all.length}`}
        >
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <span
              className="block h-full rounded-full bg-violet-500"
              style={{ width: `${busyShare}%` }}
            />
          </span>
        </Kpi>
        <Kpi
          icon="cash"
          tone="bg-emerald-100 text-emerald-700"
          label={t("stats.open")}
          value={formatTaka(openTaka)}
        />
        <Kpi
          icon="users"
          tone="bg-sky-100 text-sky-700"
          label={t("stats.seats")}
          value={`${seatsUsed}/${seatsAll}`}
        />
        <Kpi
          icon="clock"
          tone="bg-cyan-100 text-cyan-700"
          label={t("stats.booked")}
          value={String(bookedSeats)}
          note={t("stats.bookedHint", { n: reservations.length })}
        />
      </dl>

      {/* What needs someone now: quiet when nothing is waiting, coloured when something is. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-semibold text-muted-foreground">
          {t("attention")}
        </span>
        {counters.map(({ status, label }) => {
          const n = count(status);
          const tone = TONES[status];
          const pill = cn(
            "inline-flex h-9 items-center gap-2 rounded-md border pr-3 pl-1.5 text-[13.5px] font-medium transition-colors",
            n > 0
              ? "border-transparent bg-card shadow-sm ring-2 ring-inset"
              : "bg-card text-muted-foreground",
            n > 0 && status === "needs_approval" && "ring-orange-400",
            n > 0 && status === "food_ready" && "ring-emerald-500",
            n > 0 && status === "bill_requested" && "ring-blue-500",
          );
          const badge =
            status === "needs_approval"
              ? "bg-primary text-white"
              : status === "food_ready"
                ? "bg-emerald-600 text-white"
                : "bg-sky-700 text-white";
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  n > 0 ? badge : "bg-zinc-100 text-zinc-400",
                )}
              >
                <Icon name={tone.icon} className="size-3.5" />
              </span>
              {label}
              <span
                className={cn(
                  "font-bold tabular-nums",
                  n > 0 ? "text-foreground" : "text-zinc-400",
                )}
              >
                {n}
              </span>
            </>
          );
          return n > 0 && status !== "food_ready" ? (
            <Link
              key={status}
              href="/incoming"
              className={cn(pill, "hover:bg-zinc-50")}
            >
              {body}
            </Link>
          ) : (
            <span key={status} className={pill}>
              {body}
            </span>
          );
        })}
      </div>

      {/* Floor shows only the busy tables; every table is on the Tables tab. */}
      <section
        aria-labelledby="busy-title"
        className="overflow-hidden rounded-2xl border bg-card"
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700"
            >
              <Icon name="grid" className="size-[18px]" />
            </span>
            <div>
              <h2 id="busy-title" className="text-[16px] font-bold">
                {t("busyTitle")}
              </h2>
              <p className="text-[12.5px] text-muted-foreground tabular-nums">
                {t("summary", { busy: busy.length, total: all.length })}
              </p>
            </div>
          </div>
          <Link
            href="/tables"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-white px-3 text-[13.5px] font-semibold shadow-xs hover:bg-zinc-50"
          >
            {t("allTables")}
            <Icon name="go" className="size-4" />
          </Link>
        </header>
        <div className="p-3 sm:p-4">
          {busy.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">
              {t("noneBusy")}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] sm:gap-3">
              {busy.slice(0, MAX_TILES).map((table) => (
                <li key={table.id}>
                  <BoardCard table={table} back="/floor" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Reservations reservations={reservations} />

      {(floor.parcels?.length ?? 0) > 0 && (
        <section
          aria-labelledby="parcels-title"
          className="rounded-2xl border bg-card p-3 sm:p-5"
        >
          <h2 id="parcels-title" className="mb-3 text-[15px] font-semibold">
            {t("parcels.title")}
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {floor.parcels!.map((p) => {
              const empty = p.totalTaka === 0;
              return (
                <li key={p.id}>
                  <Link
                    href={orderHref(p.id)}
                    className="flex h-full flex-col gap-1 rounded-xl border bg-white p-3 hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex items-center gap-1.5 text-[18px] font-bold tabular-nums">
                      <Icon name="bag" className="size-4 text-orange-600" />
                      {p.tokenNo != null
                        ? t("parcels.token", { token: p.tokenNo })
                        : `#${p.number}`}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {formatTaka(p.totalTaka)}
                    </span>
                    <span
                      className={cn(
                        "mt-auto w-fit rounded-full px-2 py-0.5 text-[12px] font-semibold",
                        empty
                          ? "bg-zinc-100 text-zinc-600"
                          : p.readyRounds > 0
                            ? "bg-emerald-100 text-emerald-900"
                            : p.billRequested
                              ? "bg-sky-100 text-sky-900"
                              : "bg-amber-100 text-amber-900",
                      )}
                    >
                      {empty
                        ? t("parcels.empty")
                        : p.readyRounds > 0
                          ? t("parcels.ready")
                          : p.billRequested
                            ? t("parcels.bill")
                            : t("parcels.cooking")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(floor.pickups?.length ?? 0) > 0 && (
        <section
          aria-labelledby="pickups-title"
          className="rounded-2xl border bg-card p-3 sm:p-5"
        >
          <h2 id="pickups-title" className="mb-3 text-[15px] font-semibold">
            {t("pickups.title")}
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {floor.pickups!.map((p) => (
              <li key={p.id}>
                <Link
                  href={orderHref(p.id)}
                  className="flex h-full flex-col gap-1 rounded-xl border bg-white p-3 hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex items-center gap-1.5 text-[18px] font-bold tabular-nums">
                    <Icon name="bag" className="size-4 text-orange-600" />
                    {t("pickups.token", { token: p.tokenNo })}
                    {p.type === "delivery" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                        {t("pickups.delivery")}
                      </span>
                    )}
                  </span>
                  {p.guestName && (
                    <span className="truncate text-[13.5px] text-muted-foreground">
                      {p.guestName}
                    </span>
                  )}
                  <span className="text-[13px] font-semibold tabular-nums">
                    {formatTaka(p.totalTaka)}
                  </span>
                  <span
                    className={cn(
                      "mt-auto w-fit rounded-full px-2 py-0.5 text-[12px] font-semibold",
                      p.pendingRounds > 0
                        ? "bg-amber-100 text-amber-900"
                        : p.readyRounds > 0
                          ? "bg-emerald-100 text-emerald-900"
                          : p.billRequested
                            ? "bg-sky-100 text-sky-900"
                            : "bg-zinc-100 text-zinc-700",
                    )}
                  >
                    {p.pendingRounds > 0
                      ? t("pickups.toApprove")
                      : p.readyRounds > 0
                        ? t("pickups.ready")
                        : t("pickups.cooking")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The Tables tab: every table, by area, with search and the busy/free filter. */
export function TablesSection({
  floor,
  error,
}: {
  floor: Floor;
  error: ErrorReader;
}) {
  const t = useTranslations("floor");
  const area =
    floor.areas.find((a) => a.id === error.param("area")) ?? floor.areas[0];
  const query = error.param("q") ?? "";
  const show: Show =
    (["busy", "free"] as const).find((v) => v === error.param("show")) ?? "all";
  const view: Layout = error.param("view") === "3d" || error.param("view") === "room" ? "3d" : "cards";
  const areaId = floor.areas.length > 1 ? (area?.id ?? null) : null;
  const tables = area?.tables ?? [];
  const busyCount = tables.filter((table) => table.status !== "free").length;
  const href = (next: { area?: string; show?: Show; view?: Layout }) => {
    const params = new URLSearchParams();
    const a = next.area ?? areaId;
    if (a) params.set("area", a);
    // A new area starts fresh; a new filter keeps the search.
    if (!next.area && query.trim()) params.set("q", query.trim());
    const sh = next.show ?? (next.area ? "all" : show);
    if (sh !== "all") params.set("show", sh);
    const layout = next.view ?? view;
    if (layout === "3d") params.set("view", "3d");
    const qs = params.toString();
    return qs ? `/tables?${qs}` : "/tables";
  };
  const segment = (active: boolean) =>
    cn(
      "flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold whitespace-nowrap tabular-nums transition-colors",
      active
        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5"
        : "text-zinc-600 hover:text-zinc-900",
    );

  return (
    <section
      id="tables-board"
      aria-label={t("tablesTitle")}
      className="overflow-hidden rounded-2xl border bg-card shadow-xs fullscreen:overflow-y-auto fullscreen:rounded-none fullscreen:border-0 fullscreen:bg-background"
    >
      {/* One toolbar: area, search, busy/free, full screen. Stays on top while the cards scroll. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-card px-3 py-3 sm:px-4">
        {floor.areas.length > 1 && (
          <nav
            aria-label={t("areas")}
            className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1"
          >
            {floor.areas.map((a) => {
              const active = a.id === area?.id;
              const n = a.tables.filter(
                (table) => table.status !== "free",
              ).length;
              return (
                <Link
                  key={a.id}
                  href={href({ area: a.id })}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={segment(active)}
                >
                  {a.name}
                  <span
                    className={cn(
                      "text-[11.5px] font-medium",
                      active ? "text-select" : "text-zinc-500",
                    )}
                  >
                    {t("areaBusy", { busy: n, total: a.tables.length })}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
        <form
          action="/tables"
          className="relative w-full sm:w-52"
          role="search"
        >
          {areaId && <input type="hidden" name="area" value={areaId} />}
          {show !== "all" && <input type="hidden" name="show" value={show} />}
          {view === "3d" && <input type="hidden" name="view" value="3d" />}
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <label className="sr-only" htmlFor="floor-q">
            {t("search")}
          </label>
          <input
            id="floor-q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-input bg-white pr-3 pl-9 text-[14px] shadow-xs outline-none focus:border-select focus:ring-3 focus:ring-select/15"
          />
        </form>
        <nav
          aria-label={t("showLabel")}
          className="flex gap-1 rounded-lg bg-zinc-100 p-1"
        >
          {(
            [
              ["all", t("show.all", { n: tables.length })],
              ["busy", t("show.busy", { n: busyCount })],
              ["free", t("show.free", { n: tables.length - busyCount })],
            ] as const
          ).map(([value, text]) => (
            <Link
              key={value}
              href={href({ show: value })}
              scroll={false}
              aria-current={show === value ? "page" : undefined}
              className={segment(show === value)}
            >
              {text}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <nav
            aria-label={t("layout.label")}
            className="flex gap-1 rounded-lg bg-zinc-100 p-1"
          >
            {(
              [
                ["cards", t("layout.cards")],
                ["3d", t("layout.scene")],
              ] as const
            ).map(([value, text]) => (
              <Link
                key={value}
                href={href({ view: value })}
                scroll={false}
                aria-current={view === value ? "page" : undefined}
                className={segment(view === value)}
              >
                {text}
              </Link>
            ))}
          </nav>
          <FullscreenButton targetId="tables-board" />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {!area ? (
          <EmptyState
            icon="grid"
            title={t("noTablesTitle")}
            body={t("noTables")}
          />
        ) : view === "3d" ? (
          <SceneBoard tables={tables} query={query} show={show} />
        ) : (
          <TableBoard tables={tables} query={query} show={show} />
        )}
      </div>
    </section>
  );
}

/** The Tables tab: a title like the other pages, then every table. */
export function TablesView({
  floor,
  error,
}: {
  floor: Floor;
  error: ErrorReader;
}) {
  const t = useTranslations("floor");
  const tNav = useTranslations("nav");
  const all = floor.areas.flatMap((a) => a.tables);
  const busy = all.filter((table) => table.status !== "free").length;
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary"
          >
            <Icon name="seat" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight sm:text-[24px]">
              {tNav("tables")}
            </h1>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              {t("summary", { busy, total: all.length })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Legend />
        </div>
      </header>
      {error.message && <Notice>{error.message}</Notice>}
      <TablesSection floor={floor} error={error} />
    </div>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  note,
  children,
}: {
  icon: IconName;
  tone: string;
  label: string;
  value: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <dt className="truncate text-[13px] font-medium text-muted-foreground">
          {label}
        </dt>
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            tone,
          )}
        >
          <Icon name={icon} className="size-4" />
        </span>
      </div>
      <dd className="-mt-1 truncate text-[26px] leading-tight font-bold tracking-tight tabular-nums">
        {value}
      </dd>
      {note && (
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {note}
        </p>
      )}
      {children}
    </div>
  );
}

/** Today's bookings in time order: who, how many, which table. A booking with no table is waiting for one. */
function Reservations({ reservations }: { reservations: FloorReservation[] }) {
  const t = useTranslations("floor.reservations");
  return (
    <section
      aria-labelledby="reservations-title"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"
        >
          <Icon name="clock" className="size-[18px]" />
        </span>
        <h2
          id="reservations-title"
          className="flex-1 text-[15px] font-semibold"
        >
          {t("title")}
        </h2>
        {reservations.length > 0 && (
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[12px] font-semibold text-cyan-800 tabular-nums">
            {reservations.length}
          </span>
        )}
        <Link
          href="/reservations"
          className="-my-1 inline-flex h-10 items-center gap-0.5 rounded-lg px-2.5 text-[13.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {t("all")}
          <Icon name="go" className="size-4" />
        </Link>
      </header>
      {reservations.length === 0 ? (
        <p className="px-4 py-3.5 text-[13.5px] text-muted-foreground">
          <span className="font-medium text-foreground">{t("empty")}</span>{" "}
          {t("emptyHint")}
        </p>
      ) : (
        <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 [&>li]:sm:border-b [&>li]:sm:border-r">
          {reservations.map((r) => {
            const started = hasStarted(r.at);
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  started && "bg-cyan-50/70",
                )}
              >
                <span className="w-16 shrink-0">
                  <span className="block text-[14.5px] font-bold tabular-nums">
                    {formatTime(r.at, "Asia/Dhaka")}
                  </span>
                  {started && (
                    <span className="text-[11.5px] font-semibold text-cyan-700">
                      {t("now")}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {r.name}
                  </span>
                  <span className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
                    <Icon name="users" aria-hidden className="size-3.5" />
                    {t("people", { n: r.partySize })}
                  </span>
                </span>
                {r.tableLabel ? (
                  <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[13px] font-bold text-primary-foreground">
                    {r.tableLabel}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">
                    {t("noTable")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
            className={cn("size-3 rounded-[4px]", TONES[status].swatch)}
          />
          {tStatus(status)}
        </li>
      ))}
    </ul>
  );
}

/** Tables that match the search and the busy/free filter, in table-number order. */
function matchingTables(tables: FloorTable[], query: string, show: Show) {
  const q = query.trim().toLowerCase();
  return tables
    .filter(
      (table) =>
        (!q || table.label.toLowerCase().includes(q)) &&
        (show === "all" ||
          (show === "busy"
            ? table.status !== "free"
            : table.status === "free")),
    )
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
}

/** The cards in table-number order, so a table is always in the same place. Capped at MAX_TILES. */
function TableBoard({
  tables,
  query,
  show,
}: {
  tables: FloorTable[];
  query: string;
  show: Show;
}) {
  const t = useTranslations("floor");
  const matches = matchingTables(tables, query, show);
  const shown = matches.slice(0, MAX_TILES);
  if (shown.length === 0)
    return (
      <p className="rounded-xl border border-dashed py-12 text-center text-[14px] text-muted-foreground">
        {t("noMatch")}
      </p>
    );
  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] sm:gap-3">
        {shown.map((table) => (
          <li key={table.id}>
            <BoardCard table={table} back="/tables" />
          </li>
        ))}
      </ul>
      {matches.length > shown.length && (
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {t("capped", { shown: shown.length, total: matches.length })}
        </p>
      )}
    </>
  );
}

/** The 3D room for the tables that match the search and the busy/free filter. */
function SceneBoard({
  tables,
  query,
  show,
}: {
  tables: FloorTable[];
  query: string;
  show: Show;
}) {
  const t = useTranslations("floor");
  const matches = matchingTables(tables, query, show);
  const shown = matches.slice(0, MAX_TILES);
  if (shown.length === 0)
    return (
      <p className="rounded-xl border border-dashed py-12 text-center text-[14px] text-muted-foreground">
        {t("noMatch")}
      </p>
    );
  return (
    <>
      <TableSceneView
        tables={shown.map((table) => ({
          id: table.id,
          label: table.label,
          seats: table.seats,
          status: table.status,
          gridX: table.gridX,
          gridY: table.gridY,
          orderId: table.order?.id ?? null,
          totalTaka: table.order?.totalTaka ?? null,
        }))}
      />
      {matches.length > shown.length && (
        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          {t("capped", { shown: shown.length, total: matches.length })}
        </p>
      )}
    </>
  );
}

/**
 * One table: number and status pill on top, seats (or the bill and time) below.
 * Free tables are plain white, seated ones dark, the ones that need someone use their status colour.
 */
function BoardCard({
  table,
  back,
}: {
  table: FloorTable;
  back: "/floor" | "/tables";
}) {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const tone = TONES[table.status];
  const dark = table.status === "occupied";
  const label = t("tableAria", {
    table: table.label,
    status: tStatus(table.status),
  });
  const minutes = table.order ? minutesSince(table.order.openedAt) : 0;
  const time =
    minutes < 60
      ? t("minutes", { n: minutes })
      : t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
  const card = cn(
    "group flex h-[108px] w-full flex-col justify-between rounded-xl border p-3 text-left transition-[border-color,box-shadow,background-color] duration-150 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none",
    tone.tile,
  );
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "min-w-0 truncate text-[24px] leading-none font-bold tracking-tight tabular-nums",
            !dark && "text-zinc-900",
          )}
          title={table.label}
        >
          {table.label}
        </span>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold",
            tone.pill,
          )}
        >
          {table.status !== "free" && (
            <Icon
              name={tone.icon}
              className={cn(
                "size-3.5",
                table.status === "needs_approval" && "animate-pulse",
              )}
            />
          )}
          {tStatus(table.status)}
        </span>
      </span>
      {table.nextReservation && table.status === "free" && (
        <span className="truncate text-[11.5px] font-semibold text-sky-700">
          {t("booked", {
            time: formatTime(table.nextReservation.at, "Asia/Dhaka"),
            name: table.nextReservation.name,
            n: table.nextReservation.partySize,
          })}
        </span>
      )}
      <span
        className={cn(
          "flex items-center justify-between gap-2 text-[13px] font-medium tabular-nums",
          dark ? "text-zinc-300" : "text-zinc-500",
        )}
      >
        {table.order ? (
          <>
            <span
              className={cn(
                "truncate text-[15px] font-bold",
                dark ? "text-white" : "text-zinc-900",
              )}
            >
              {formatTaka(table.order.totalTaka)}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Icon name="clock" className="size-3.5" />
              {time}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <Icon name="seat" className="size-3.5" />
              {t("seats", { n: table.seats })}
            </span>
            <span className="flex items-center gap-0.5 font-semibold text-select opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Icon name="plus" className="size-3.5" />
              {t("open")}
            </span>
          </>
        )}
      </span>
    </>
  );
  if (table.order) {
    return (
      <Link
        href={orderHref(table.order.id)}
        aria-label={label}
        className={card}
      >
        {body}
      </Link>
    );
  }
  return (
    <form action={openOrder}>
      <input type="hidden" name="tableId" value={table.id} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" aria-label={label} className={card}>
        {body}
      </button>
    </form>
  );
}
