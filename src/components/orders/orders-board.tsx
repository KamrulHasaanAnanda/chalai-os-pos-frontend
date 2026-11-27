"use client";
// Client component: the Orders list. Filter tabs with counts, a search box ("/" focuses it), and one dense table
// (or a card grid: the toggle, and automatically below 1024px). Open orders first, oldest at the top, with a live
// duration that turns amber after an hour and red after two. A row opens the order in the side drawer (?view=).

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from "react";
import { Icon } from "@/components/icons";
import type { OrderStatus, OrderSummary } from "@/lib/api/types";
import { useNow } from "@/lib/clock";
import { formatTaka, formatTime } from "@/lib/format";
import { orderNo } from "@/lib/order-no";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

const STATUSES: OrderStatus[] = ["open", "paid", "cancelled"];
const AMBER_MIN = 60;
const RED_MIN = 120;

const DOT: Record<OrderStatus, string> = {
  open: "bg-zinc-800",
  paid: "bg-emerald-500",
  cancelled: "bg-zinc-300",
};

// Table or cards: a per-device choice, read without a hydration mismatch.
const LAYOUT_KEY = "chalai-pos-orders-layout";
const LAYOUT_EVENT = "chalai-pos-orders-layout";
const subscribeLayout = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(LAYOUT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LAYOUT_EVENT, onChange);
  };
};
const readLayout = (): "table" | "cards" => {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
};

const minutesBetween = (from: string, to: number) => Math.max(0, Math.floor((to - new Date(from).getTime()) / 60000));

/** Open first (oldest on top: they've waited longest), then paid (latest first), then cancelled. */
function sorted(orders: OrderSummary[]) {
  const rank = { open: 0, paid: 1, cancelled: 2 };
  const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
  return [...orders].sort((a, b) =>
    rank[a.status] !== rank[b.status]
      ? rank[a.status] - rank[b.status]
      : a.status === "open"
        ? time(a.openedAt) - time(b.openedAt)
        : time(b.closedAt ?? b.openedAt) - time(a.closedAt ?? a.openedAt),
  );
}

function matches(o: OrderSummary, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/^#/, "");
  if (o.tableLabel?.toLowerCase().includes(q)) return true;
  if (/^\d+$/.test(digits) && (String(o.number) === String(Number(digits)) || String(o.tokenNo ?? "") === digits))
    return true;
  return orderNo(o.number).includes(digits) || (o.offlineRef?.toLowerCase().includes(q) ?? false);
}

export function OrdersBoard({
  orders,
  timeZone,
  canBill,
  isToday,
  here,
}: {
  orders: OrderSummary[];
  timeZone: string;
  canBill: boolean;
  isToday: boolean;
  /** This page's URL (with its date): the drawer link adds ?view= to it. */
  here: string;
}) {
  const t = useTranslations("orders");
  const tStatus = useTranslations("orderStatus");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = STATUSES.find((s) => s === params.get("status"));
  const [status, setStatus] = useState<OrderStatus | undefined>(initial);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const layout = useSyncExternalStore(subscribeLayout, readLayout, () => "table" as const);

  // "/" jumps to search (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (next: OrderStatus | undefined) => {
    setStatus(next);
    // Keep the tab in the URL (shareable, survives a refresh) without a server round trip.
    const url = new URLSearchParams(params.toString());
    if (next) url.set("status", next);
    else url.delete("status");
    url.delete("view");
    window.history.replaceState(null, "", url.size ? `${pathname}?${url}` : pathname);
  };
  const setLayout = (next: "table" | "cards") => {
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      // Private mode: lasts until reload.
    }
    window.dispatchEvent(new Event(LAYOUT_EVENT));
  };

  const all = useMemo(() => sorted(orders), [orders]);
  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = { open: 0, paid: 0, cancelled: 0 };
    for (const o of orders) c[o.status] += 1;
    return c;
  }, [orders]);
  const shown = all.filter((o) => (!status || o.status === status) && matches(o, query));
  const viewHref = (id: string) => `${here}${here.includes("?") ? "&" : "?"}view=${encodeURIComponent(id)}`;
  const openDrawer = (id: string) => router.push(viewHref(id), { scroll: false });
  const rowKeys = (id: string) => (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDrawer(id);
    }
  };
  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();
  const where = (o: OrderSummary) =>
    o.tableLabel ? o.tableLabel : o.tokenNo ? t("pickup", { token: o.tokenNo }) : t("takeaway");
  const rowLabel = (o: OrderSummary) =>
    t("rowLabel", {
      where: o.tableLabel ? t("table", { table: o.tableLabel }) : where(o),
      number: orderNo(o.number),
      status: tStatus(o.status),
    });

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
          <Icon name="receipt" className="size-6" />
        </span>
        <p className="mt-3 text-[16px] font-bold">{isToday ? t("emptyToday") : t("emptyDay")}</p>
        {isToday && (
          <>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{t("emptyTodayHint")}</p>
            <Link
              href="/floor"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none"
            >
              <Icon name="plus" className="size-[18px]" />
              {t("newOrder")}
            </Link>
          </>
        )}
      </div>
    );
  }

  const actions = (o: OrderSummary, size: "row" | "card") =>
    o.status === "open" ? (
      <span className="flex items-center justify-end gap-1.5">
        {canBill && (
          <Link
            href={orderHref(o.id, "bill")}
            onClick={stop}
            onKeyDown={stop}
            aria-label={t("billOrder", { number: orderNo(o.number) })}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
              size === "row" ? "h-9 text-[13px]" : "h-10 flex-1 text-[13.5px]",
            )}
          >
            <Icon name="cash" className="size-4" />
            {t("bill")}
          </Link>
        )}
        <Link
          href={orderHref(o.id)}
          onClick={stop}
          onKeyDown={stop}
          aria-label={t("viewOrder", { number: orderNo(o.number) })}
          title={t("view")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-muted hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
        >
          <Icon name="eye" className="size-[18px]" />
        </Link>
      </span>
    ) : (
      <span className="flex justify-end text-zinc-400" aria-hidden>
        <Icon name="go" className="size-[18px]" />
      </span>
    );

  const amount = (o: OrderSummary) =>
    o.status === "cancelled" ? (
      <span className="text-zinc-400 line-through">{formatTaka(o.totalTaka)}</span>
    ) : (
      <span className="flex flex-col items-end leading-tight">
        <span className="font-bold text-zinc-900">{formatTaka(o.status === "open" ? o.dueTaka : o.totalTaka)}</span>
        <span className={cn("text-[11.5px] font-medium", o.status === "paid" ? "text-emerald-700" : "text-zinc-500")}>
          {o.status === "paid" ? t("paidSub") : t("dueSub")}
        </span>
      </span>
    );

  const cardsOnly = layout === "cards";

  return (
    <section aria-label={t("title")} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label={t("filter")} className="max-w-full overflow-x-auto">
          <ul className="inline-flex gap-1 rounded-xl bg-muted p-1">
            {[undefined, ...STATUSES].map((s) => {
              const active = s === status;
              const n = s ? counts[s] : orders.length;
              return (
                <li key={s ?? "all"}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none",
                      active ? "bg-card text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
                    )}
                  >
                    {s && <span aria-hidden className={cn("size-2 rounded-full", DOT[s])} />}
                    {s ? tStatus(s) : t("all")}
                    <span
                      className={cn(
                        "min-w-6 rounded-full px-1.5 text-[12px] font-bold tabular-nums",
                        active ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600",
                      )}
                    >
                      {n}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <label className="relative flex h-11 min-w-[220px] flex-1 items-center sm:max-w-[340px]">
          <span className="sr-only">{t("searchLabel")}</span>
          <Icon name="search" className="pointer-events-none absolute left-3 size-4 text-zinc-400" />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={t("search")}
            className="h-full w-full rounded-xl border border-input bg-card pr-10 pl-9 text-[14px] outline-none placeholder:text-zinc-400 focus:border-select focus:ring-3 focus:ring-select/20"
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 rounded border bg-zinc-50 px-1.5 text-[11px] font-medium text-zinc-500"
          >
            /
          </kbd>
        </label>
        <div
          role="group"
          aria-label={t("layoutLabel")}
          className="ml-auto hidden items-center rounded-lg border bg-card p-0.5 lg:flex"
        >
          {(["table", "cards"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayout(l)}
              aria-pressed={layout === l}
              aria-label={l === "table" ? t("layoutTable") : t("layoutCards")}
              title={l === "table" ? t("layoutTable") : t("layoutCards")}
              className={cn(
                "flex size-9 items-center justify-center rounded-md focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none",
                layout === l ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-muted hover:text-zinc-900",
              )}
            >
              <Icon name={l === "table" ? "list" : "grid"} className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-[14px] text-muted-foreground">
          {query ? t("noMatch", { q: query.trim() }) : t("noneInTab", { status: status ? tStatus(status).toLowerCase() : "" })}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
              className="rounded-md px-2 py-1 font-semibold text-zinc-900 underline-offset-2 hover:underline"
            >
              {t("clearSearch")}
            </button>
          )}
        </p>
      ) : (
        <>
          {/* Laptops: one dense table, full width. */}
          {!cardsOnly && (
            <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
              <table className="w-full text-[14px]">
                <thead className="bg-zinc-50 text-left text-[12px] font-semibold text-zinc-500">
                  <tr className="[&>th]:px-3 [&>th]:py-2.5">
                    <th scope="col" className="w-8">
                      <span className="sr-only">{t("colStatus")}</span>
                    </th>
                    <th scope="col">{t("colTable")}</th>
                    <th scope="col">{t("colOrder")}</th>
                    <th scope="col">{t("colOpened")}</th>
                    <th scope="col">{t("colDuration")}</th>
                    <th scope="col" className="text-right">{t("colItems")}</th>
                    <th scope="col">{t("colServer")}</th>
                    <th scope="col" className="text-right">{t("colAmount")}</th>
                    <th scope="col" className="w-36">
                      <span className="sr-only">{t("colActions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((o) => (
                    <tr
                      key={o.id}
                      tabIndex={0}
                      aria-label={rowLabel(o)}
                      onClick={() => openDrawer(o.id)}
                      onKeyDown={rowKeys(o.id)}
                      className={cn(
                        "h-14 cursor-pointer transition-colors outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:shadow-[inset_3px_0_0_var(--select)] [&>td]:px-3",
                        o.status === "cancelled" && "text-zinc-500",
                      )}
                    >
                      <td>
                        <span aria-hidden className={cn("block size-2.5 rounded-full", DOT[o.status])} />
                      </td>
                      <td className="font-semibold">{where(o)}</td>
                      <td>
                        <span className="font-mono text-[14.5px] font-semibold text-zinc-900">{orderNo(o.number)}</span>
                        {o.offlineRef && <span className="ml-1.5 text-[11.5px] text-muted-foreground">{o.offlineRef}</span>}
                      </td>
                      <td className="text-zinc-600 tabular-nums">{formatTime(o.openedAt, timeZone)}</td>
                      <td>
                        <Duration order={o} />
                      </td>
                      <td className="text-right tabular-nums">{o.itemCount ?? "–"}</td>
                      <td className="max-w-[140px] truncate text-zinc-600">{o.serverName ?? "–"}</td>
                      <td className="text-right tabular-nums">{amount(o)}</td>
                      <td>{actions(o, "row")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tablets and phones (and the card toggle): compact cards that fill the row. */}
          <ul className={cn("grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3", !cardsOnly && "lg:hidden")}>
            {shown.map((o) => (
              <li key={o.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={rowLabel(o)}
                  onClick={() => openDrawer(o.id)}
                  onKeyDown={rowKeys(o.id)}
                  className={cn(
                    "flex h-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-3.5 transition-colors outline-none hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-select/30",
                    o.status === "cancelled" && "text-zinc-500",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", DOT[o.status])} />
                        <span className="truncate text-[16px] font-bold">
                          {o.tableLabel ? t("table", { table: o.tableLabel }) : where(o)}
                        </span>
                      </span>
                      <span className="mt-0.5 block font-mono text-[14px] font-semibold text-zinc-800">
                        {orderNo(o.number)}
                      </span>
                    </span>
                    <span className="text-right text-[15px] tabular-nums">{amount(o)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-zinc-600 tabular-nums">
                    <span>{formatTime(o.openedAt, timeZone)}</span>
                    <Duration order={o} />
                    {o.itemCount !== undefined && <span>{t("itemsShort", { n: o.itemCount })}</span>}
                    {o.serverName && <span className="truncate">{o.serverName}</span>}
                  </div>
                  <div className="mt-auto">{actions(o, "card")}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** How long the order has been (or was) open. Live for open orders: amber after an hour, red after two. */
function Duration({ order }: { order: OrderSummary }) {
  const t = useTranslations("orders");
  const now = useNow();
  const open = order.status === "open";
  const end = open ? now : order.closedAt ? new Date(order.closedAt).getTime() : null;
  if (end === null) return <span className="text-zinc-400">–</span>;
  const minutes = minutesBetween(order.openedAt, end);
  const text = minutes < 60 ? t("minutes", { n: minutes }) : t("duration", { h: Math.floor(minutes / 60), m: minutes % 60 });
  const tone = !open
    ? "text-zinc-500"
    : minutes >= RED_MIN
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : minutes >= AMBER_MIN
        ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
        : "text-zinc-700";
  return (
    <span
      title={open && minutes >= AMBER_MIN ? (minutes >= RED_MIN ? t("late") : t("overdue")) : undefined}
      className={cn("inline-flex items-center gap-1 rounded-full font-medium tabular-nums", open && minutes >= AMBER_MIN && "px-2 py-0.5", tone)}
    >
      {open && <Icon name="clock" className="size-3.5" />}
      {text}
    </span>
  );
}
