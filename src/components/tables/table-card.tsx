"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { openOrder } from "@/actions/orders";
import { Icon, type IconName } from "@/components/icons";
import type { FloorTable, TableStatus } from "@/lib/api/types";
import { formatTaka, minutesSince } from "@/lib/format";
import { orderHref, withParams } from "@/lib/paths";
import {
  TABLE_SEATED_CRITICAL_MINUTES,
  TABLE_SEATED_WARN_MINUTES,
  TABLE_STATUS_STRIP,
  TABLE_STALE_ORDER_HOURS,
} from "@/lib/table-card-config";
import { cn } from "@/lib/utils";

const PILL: Record<TableStatus, string> = {
  free: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 ring-inset",
  occupied: "bg-white/15 text-white",
  needs_approval: "bg-orange-500 text-white",
  food_ready: "bg-emerald-600 text-white",
  bill_requested: "bg-blue-600 text-white",
};

const ICON: Record<TableStatus, IconName> = {
  free: "plus",
  occupied: "users",
  needs_approval: "bell",
  food_ready: "checkCircle",
  bill_requested: "receipt",
};

const SURFACE: Record<TableStatus, string> = {
  free: "border-zinc-200 bg-white text-zinc-900 shadow-xs hover:border-orange-400 hover:shadow-md",
  occupied: "border-zinc-900 bg-zinc-900 text-white shadow-sm",
  needs_approval: "border-orange-300 bg-orange-50 text-zinc-900 shadow-sm",
  food_ready: "border-emerald-400 bg-emerald-50 text-zinc-900 shadow-sm",
  bill_requested: "border-blue-400 bg-blue-50 text-zinc-900 shadow-sm",
};

type Variant = "compact" | "large";

function primaryAction(
  status: TableStatus,
  orderId: string,
): { href: string; labelKey: "addOrder" | "approve" | "markServed" | "printBill" | "markPaid" } | null {
  if (status === "free") return null;
  if (status === "needs_approval") return { href: orderHref(orderId), labelKey: "approve" };
  if (status === "food_ready") return { href: orderHref(orderId), labelKey: "markServed" };
  if (status === "bill_requested") return { href: orderHref(orderId, "bill"), labelKey: "printBill" };
  return {
    href: withParams(orderHref(orderId), { tab: "add" }),
    labelKey: "addOrder",
  };
}

export function TableCard({
  table,
  variant,
  nowMs,
  back = "/tables",
}: {
  table: FloorTable;
  variant: Variant;
  nowMs: number;
  back?: "/floor" | "/tables";
}) {
  const t = useTranslations("floor.tableCard");
  const tStatus = useTranslations("tableStatus");
  const busy = table.status !== "free";
  const large = busy && variant === "large";
  const order = table.order;
  const minutes = order ? minutesSince(order.openedAt, nowMs) : 0;
  const stale = Boolean(order && minutes >= TABLE_STALE_ORDER_HOURS * 60);
  const timeClass =
    minutes >= TABLE_SEATED_CRITICAL_MINUTES
      ? "text-red-600"
      : minutes >= TABLE_SEATED_WARN_MINUTES
        ? "text-amber-600"
        : busy && table.status === "occupied"
          ? "text-zinc-300"
          : "text-muted-foreground";
  const timeLabel =
    minutes < 60
      ? t("minutes", { n: minutes })
      : t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });

  const itemsTotal = order?.itemsTotal ?? 0;
  const itemsServed = order?.itemsServed ?? 0;
  const progress =
    itemsTotal > 0 ? Math.min(100, Math.round((itemsServed / itemsTotal) * 100)) : 0;
  const guestCount = order?.guestCount ?? null;
  const waiter = order?.waiterName?.trim() || null;
  const readyCount = order?.readyCount ?? 0;
  const action = order ? primaryAction(table.status, order.id) : null;

  const label = t("aria", { table: table.label, status: tStatus(table.status) });
  const pad = large ? "p-4 pt-5" : "p-2.5 pt-4";

  const body = (
    <CardSurface
      large={large}
      table={table}
      pad={pad}
      ariaLabel={label}
      interactive={!large}
      orderId={order?.id}
    >
      <CardHeader
        table={table}
        large={large}
        busy={busy}
        tStatus={tStatus}
        guestCount={guestCount}
        waiter={waiter}
        linkTable={large && !!order}
        orderId={order?.id}
      />
      {order ? (
        <div className={cn("relative z-10 mt-auto space-y-2", large ? "pt-3" : "pt-1.5")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "font-bold tabular-nums",
                large ? "text-xl" : "text-base",
                table.status === "occupied" ? "text-white" : "text-zinc-900",
              )}
            >
              {formatTaka(order.totalTaka)}
            </span>
            <span className={cn("flex items-center gap-1 text-[13px] font-medium tabular-nums", timeClass)}>
              <Icon name="clock" className="size-3.5" />
              {timeLabel}
            </span>
          </div>
          {large && itemsTotal > 0 ? (
            <div>
              <p className="text-[12.5px] font-medium text-muted-foreground">
                {t("servedProgress", { served: itemsServed, total: itemsTotal })}
              </p>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <span
                  className="block h-full rounded-full bg-emerald-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </div>
          ) : null}
          {large && readyCount > 0 ? (
            <span className="inline-flex w-fit rounded-full bg-emerald-600 px-2.5 py-0.5 text-[12px] font-semibold text-white">
              {t("readyBadge", { n: readyCount })}
            </span>
          ) : null}
          {stale ? (
            <p className="rounded-md bg-red-100 px-2 py-1 text-[12px] font-semibold text-red-800">
              {t("staleWarning")}
            </p>
          ) : null}
          {large && action ? (
            <Link
              href={action.href}
              className="inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-[14px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {t(action.labelKey)}
            </Link>
          ) : null}
          {large && order ? <OverflowMenu orderId={order.id} /> : null}
        </div>
      ) : (
        <p className="mt-auto flex items-center justify-between text-[13px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon name="seat" className="size-3.5" />
            {t("seats", { n: table.seats })}
          </span>
          <span className="flex items-center gap-0.5 font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Icon name="plus" className="size-3.5" />
            {t("open")}
          </span>
        </p>
      )}
    </CardSurface>
  );

  if (order && !large) {
    return (
      <Link
        href={orderHref(order.id)}
        aria-label={label}
        className="block min-h-11 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/30"
      >
        {body}
      </Link>
    );
  }
  if (order) return <div className="min-h-11">{body}</div>;

  return (
    <form action={openOrder} className="min-h-11">
      <input type="hidden" name="tableId" value={table.id} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={label}
        className="block w-full min-h-11 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/30"
      >
        {body}
      </button>
    </form>
  );
}

function CardSurface({
  children,
  table,
  large,
  pad,
  ariaLabel,
  interactive,
  orderId,
}: {
  children: ReactNode;
  table: FloorTable;
  large: boolean;
  pad: string;
  ariaLabel: string;
  interactive: boolean;
  orderId?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-150",
        SURFACE[table.status],
        large ? "min-h-[11.5rem]" : "min-h-[5.5rem]",
        pad,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1.5", TABLE_STATUS_STRIP[table.status])}
      />
      {interactive && orderId ? (
        <Link
          href={orderHref(orderId)}
          aria-label={ariaLabel}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/30"
        />
      ) : null}
      {children}
    </div>
  );
}

function CardHeader({
  table,
  large,
  busy,
  tStatus,
  guestCount,
  waiter,
  linkTable,
  orderId,
}: {
  table: FloorTable;
  large: boolean;
  busy: boolean;
  tStatus: (s: TableStatus) => string;
  guestCount: number | null;
  waiter: string | null;
  linkTable: boolean;
  orderId?: string;
}) {
  const t = useTranslations("floor.tableCard");
  const pulse = table.status === "needs_approval" || table.status === "food_ready";
  const dark = table.status === "occupied";

  const number = (
    <span
      className={cn(
        "min-w-0 truncate font-bold tabular-nums leading-none",
        large ? "text-[28px]" : "text-[22px]",
        dark ? "text-white" : "text-zinc-900",
      )}
      title={table.label}
    >
      {table.label}
    </span>
  );

  return (
    <div className="relative z-10 flex flex-col gap-1 pt-0.5">
      <div className="flex items-start justify-between gap-2">
        {linkTable && orderId ? (
          <Link href={orderHref(orderId)} className="min-w-0 hover:underline">
            {number}
          </Link>
        ) : (
          number
        )}
        <span
          className={cn(
            "inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold",
            PILL[table.status],
            pulse && "animate-pulse",
          )}
        >
          {busy ? <Icon name={ICON[table.status]} className="size-3.5" /> : null}
          {tStatus(table.status)}
        </span>
      </div>
      {large && busy ? (
        <div
          className={cn(
            "text-[12.5px] font-medium",
            dark ? "text-zinc-300" : "text-muted-foreground",
          )}
        >
          {guestCount != null ? (
            <span>{t("guestsSeats", { guests: guestCount, seats: table.seats })}</span>
          ) : (
            <span>{t("seats", { n: table.seats })}</span>
          )}
          {waiter ? (
            <span className={cn("mt-0.5 block truncate", dark ? "text-zinc-400" : "")}>
              {t("waiter", { name: waiter })}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OverflowMenu({ orderId }: { orderId: string }) {
  const t = useTranslations("floor.tableCard");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <div ref={ref} className="relative z-10 flex justify-end">
      <button
        type="button"
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-bold text-zinc-700"
        aria-expanded={open}
        aria-label={t("moreLabel")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute top-12 right-0 z-20 min-w-[10.5rem] overflow-hidden rounded-lg border bg-white py-1 shadow-lg"
        >
          <li>
            <Link
              role="menuitem"
              href={orderHref(orderId)}
              className="block px-3 py-2.5 text-[13.5px] font-medium hover:bg-zinc-50"
            >
              {t("moreMove")}
            </Link>
          </li>
          <li>
            <Link
              role="menuitem"
              href={orderHref(orderId)}
              className="block px-3 py-2.5 text-[13.5px] font-medium hover:bg-zinc-50"
            >
              {t("moreMerge")}
            </Link>
          </li>
          <li>
            <Link
              role="menuitem"
              href={orderHref(orderId)}
              className="block px-3 py-2.5 text-[13.5px] font-medium text-red-700 hover:bg-red-50"
            >
              {t("moreCancel")}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}