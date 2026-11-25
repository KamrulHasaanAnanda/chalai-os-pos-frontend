"use client";
// The offline till (pos-offline spec). Runs only from the snapshot in IndexedDB: open a free table or a parcel, send a round,
// take cash or a typed bKash / Nagad / card payment, cash in/out, and print the kitchen slip and the receipt.
// Every write goes to the outbox with its own ids and key, and uploads in order when the connection is back.

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CashDrawerButton } from "@/components/cash-drawer";
import { Icon } from "@/components/icons";
import { openDrawerForCash, setDrawerEnabled } from "@/lib/drawer";
import { billRoles } from "@/lib/roles";
import type { MenuItem, Order, PaymentMethod } from "@/lib/api/types";
import { offlineBill, type BillSettings } from "@/lib/offline/bill";
import { discard, enqueue, flush, retry, startOffline, useOutbox } from "@/lib/offline/outbox";
import { listEntries, listOrders, loadSnapshot, nextOfflineRef, putOrder, type LocalOrder, type OutboxEntry, type Snapshot } from "@/lib/offline/store";
import { cn } from "@/lib/utils";

const uuid = () => crypto.randomUUID();
const money = (paisa: number) => `৳${new Intl.NumberFormat("en-IN", { minimumFractionDigits: paisa % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(paisa / 100)}`;
const clock = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(iso));
const toPaisa = (s: string) => Math.round(Number(s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).trim()) * 100);

const load = (): Promise<[Snapshot | null, LocalOrder[], OutboxEntry[]]> =>
  Promise.all([loadSnapshot().then((x) => x ?? null).catch(() => null), listOrders().catch(() => []), listEntries().catch(() => [])]);

type Slip = { kind: "kot" | "receipt"; order: LocalOrder; lines: LocalOrder["lines"]; at: string };

type T = ReturnType<typeof useTranslations<"offline">>;
/** "Table 4", or "Parcel K7Q-0042" for a takeaway opened here. */
const orderLabel = (t: T, o: Pick<LocalOrder, "tableId" | "tableLabel" | "offlineRef">) =>
  o.tableId ? t("table", { table: o.tableLabel }) : o.offlineRef ? t("parcelRef", { ref: o.offlineRef }) : t("parcel");

const newOrder = (tableId: string | null, tableLabel: string): LocalOrder => ({
  id: uuid(),
  tableId,
  tableLabel,
  offlineRef: null,
  openedHere: true,
  number: null,
  openedAt: new Date().toISOString(),
  lines: [],
  serverLines: [],
  serverPaidPaisa: 0,
  payments: [],
  closed: false,
});

/** An order the server already had, as the offline till carries it. */
function fromServer(order: Order, tableId: string, tableLabel: string): LocalOrder {
  return {
    id: order.id,
    tableId,
    tableLabel,
    openedHere: false,
    number: order.number,
    openedAt: order.openedAt,
    lines: [],
    serverPaidPaisa: Math.round(order.paidTaka * 100),
    serverLines: order.rounds
      .filter((r) => r.status !== "rejected")
      .flatMap((r) => r.items.filter((i) => !i.cancelledAt).map((i) => ({ name: i.name, unitPricePaisa: Math.round(i.unitPriceTaka * 100), quantity: i.quantity }))),
    payments: [],
    closed: false,
  };
}

export function OfflineTill() {
  const t = useTranslations("offline");
  const outbox = useOutbox();
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(undefined);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [problems, setProblems] = useState<OutboxEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [slip, setSlip] = useState<Slip | null>(null);

  const apply = useCallback(([s, o, e]: [Snapshot | null, LocalOrder[], OutboxEntry[]]) => {
    setSnapshot(s);
    setOrders(o);
    setProblems(e.filter((x) => x.state === "failed"));
  }, []);
  const reload = useCallback(() => load().then(apply), [apply]);

  // Loads on open, and again as the outbox uploads, so the screen shows what is left.
  useEffect(() => {
    startOffline();
    let live = true;
    load().then((data) => live && apply(data));
    return () => {
      live = false;
    };
  }, [outbox.pending, outbox.failed, apply]);

  useEffect(() => {
    if (!slip) return;
    const done = () => setSlip(null);
    window.addEventListener("afterprint", done, { once: true });
    const id = setTimeout(() => window.print(), 50);
    return () => clearTimeout(id);
  }, [slip]);

  const settings: BillSettings | null = snapshot?.me.restaurant
    ? {
        vatPercent: snapshot.me.restaurant.vatPercent,
        vatMode: snapshot.me.restaurant.vatMode ?? "exclusive",
        serviceChargePercent: snapshot.me.restaurant.serviceChargePercent ?? 0,
        roundToTaka: snapshot.me.restaurant.roundToTaka ?? false,
      }
    : null;

  async function save(order: LocalOrder) {
    await putOrder(order);
    setOrders((os) => [...os.filter((o) => o.id !== order.id), order]);
  }

  const current = orders.find((o) => o.id === openId) ?? null;
  const drawerOn = snapshot?.me.restaurant?.cashDrawer === true;
  useEffect(() => setDrawerEnabled(drawerOn), [drawerOn]);
  const canOpenDrawer = drawerOn && !!snapshot && billRoles.includes(snapshot.me.user.role);

  return (
    <div className="min-h-dvh bg-zinc-50 print:bg-white">
      <div className="print:hidden">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
          <h1 className="text-[17px] font-bold">{t("title")}</h1>
          <span
            role="status"
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md bg-white/10 px-2.5 text-[13px] font-medium",
            )}
          >
            <span aria-hidden className={cn("size-2 rounded-full", !outbox.online ? "bg-red-400" : outbox.pending > 0 ? "animate-pulse bg-amber-400" : "bg-green-500")} />
            {!outbox.online ? t("offline") : outbox.pending > 0 ? t("syncing", { n: outbox.pending }) : t("online")}
          </span>
          <span className="flex-1" />
          {canOpenDrawer && <CashDrawerButton className="border-transparent bg-white/10 text-white hover:bg-white/20" />}
          {outbox.online && (
            <Link href="/floor" className="rounded-md bg-white px-3 py-1.5 text-[13.5px] font-semibold text-zinc-900">
              {t("openFloor")}
            </Link>
          )}
        </header>

        <main className="mx-auto grid max-w-5xl gap-4 p-4">
          <section className="rounded-xl bg-amber-50 p-4 text-[14px] text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">{outbox.online && outbox.pending === 0 ? t("backOnline") : t("lead")}</p>
            <p className="mt-1">{t("notHere")}</p>
            {snapshot && <p className="mt-1 text-[12.5px] text-amber-800">{t("savedAt", { time: clock(snapshot.savedAt) })}</p>}
          </section>

          {problems.length > 0 && snapshot && (
            <Problems problems={problems} snapshot={snapshot} orders={orders} onChange={reload} />
          )}

          {snapshot === undefined ? null : snapshot === null || !settings ? (
            <p className="rounded-xl border bg-white p-6 text-center text-[15px]">{t("noSnapshot")}</p>
          ) : current ? (
            <OrderScreen
              key={current.id}
              order={current}
              menu={snapshot.menu}
              settings={settings}
              onBack={() => setOpenId(null)}
              onSave={save}
              onPrint={(s) => setSlip(s)}
            />
          ) : (
            <>
              <Tables
                snapshot={snapshot}
                orders={orders}
                onOpen={async (tableId, tableLabel) => {
                  const local = orders.find((o) => o.tableId === tableId && !o.closed);
                  if (local) return setOpenId(local.id);
                  const server = snapshot.orders.find((o) => o.tableId === tableId && o.status === "open");
                  const order: LocalOrder = server ? fromServer(server, tableId, tableLabel) : newOrder(tableId, tableLabel);
                  await save(order);
                  setOpenId(order.id);
                }}
                onParcel={async () => {
                  const order = newOrder(null, "");
                  await save(order);
                  setOpenId(order.id);
                }}
                onResume={setOpenId}
              />
              <CashMove />
            </>
          )}
        </main>
      </div>
      {slip && (
        <PrintSlip slip={slip} restaurant={snapshot?.me.restaurant?.name ?? ""} settings={settings} widthMm={snapshot?.me.restaurant?.receiptWidthMm ?? 80} />
      )}
    </div>
  );
}

function Tables({
  snapshot,
  orders,
  onOpen,
  onParcel,
  onResume,
}: {
  snapshot: Snapshot;
  orders: LocalOrder[];
  onOpen: (tableId: string, label: string) => void;
  onParcel: () => void;
  onResume: (orderId: string) => void;
}) {
  const t = useTranslations("offline");
  const parcels = orders.filter((o) => o.tableId === null && !o.closed);
  return (
    <section aria-label={t("tables")} className="grid gap-4">
      <div>
        <h2 className="mb-2 text-[13px] font-bold tracking-wide text-zinc-500 uppercase">{t("parcels")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <button
            type="button"
            onClick={onParcel}
            className="flex h-20 flex-col items-start justify-between rounded-xl border-2 border-dashed border-zinc-300 bg-white p-3 text-left hover:border-zinc-500"
          >
            <Icon name="plus" className="size-5" />
            <span className="text-[14px] font-semibold">{t("newParcel")}</span>
          </button>
          {parcels.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onResume(o.id)}
              className="flex h-20 flex-col items-start justify-between rounded-xl bg-sky-600 p-3 text-left text-white ring-1 ring-sky-600"
            >
              <span className="text-[16px] font-bold">{orderLabel(t, o)}</span>
              <span className="text-[12.5px] text-white/90">{t("local")}</span>
            </button>
          ))}
        </div>
      </div>
      {snapshot.floor.areas.map((area) => (
        <div key={area.id}>
          <h2 className="mb-2 text-[13px] font-bold tracking-wide text-zinc-500 uppercase">{area.name}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {area.tables.map((table) => {
              const local = orders.find((o) => o.tableId === table.id && !o.closed);
              const busy = !!table.order;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => onOpen(table.id, table.label)}
                  className={cn(
                    "flex h-20 flex-col items-start justify-between rounded-xl p-3 text-left ring-1",
                    local ? "bg-sky-600 text-white ring-sky-600" : busy ? "bg-white ring-amber-300" : "bg-white ring-zinc-200 hover:ring-zinc-400",
                  )}
                >
                  <span className="text-[18px] font-bold">{table.label}</span>
                  <span className={cn("text-[12.5px]", local ? "text-white/90" : "text-zinc-500")}>{local ? t("local") : busy ? t("busy") : t("free")}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function OrderScreen({
  order,
  menu,
  settings,
  onBack,
  onSave,
  onPrint,
}: {
  order: LocalOrder;
  menu: Snapshot["menu"];
  settings: BillSettings;
  onBack: () => void;
  onSave: (o: LocalOrder) => Promise<void>;
  onPrint: (s: Slip) => void;
}) {
  const t = useTranslations("offline");
  const tm = useTranslations("paymentMethod");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i])), [menu]);

  const allLines = [...order.serverLines, ...order.lines];
  const paid = order.serverPaidPaisa + order.payments.reduce((s, p) => s + p.amountPaisa, 0);
  const bill = offlineBill(allLines, settings, paid);
  const cartLines = Object.entries(cart).filter(([, q]) => q > 0);

  async function send() {
    if (cartLines.length === 0) return;
    const lines = cartLines.map(([id, quantity]) => {
      const item = items.get(id)!;
      return { menuItemId: id, name: item.name, unitPricePaisa: Math.round(item.priceTaka * 100), quantity };
    });
    const first = order.openedHere && order.lines.length === 0;
    let opened = order;
    if (first) {
      // The server has no number for this order yet, so the slips carry the device's own (K7Q-0042).
      opened = { ...order, offlineRef: order.offlineRef ?? (await nextOfflineRef()) };
      await enqueue({
        key: `open-${order.id}`,
        path: "/pos/orders",
        body: { id: order.id, tableId: order.tableId, offlineRef: opened.offlineRef },
        orderId: order.id,
        label: orderLabel(t, opened),
      });
    }
    const roundId = uuid();
    await enqueue({
      key: `round-${roundId}`,
      path: `/pos/orders/${order.id}/rounds`,
      body: {
        id: roundId,
        offline: true,
        clientRequestId: `off-${roundId}`,
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, unitPriceTaka: l.unitPricePaisa / 100 })),
      },
      orderId: order.id,
      label: orderLabel(t, opened),
    });
    const next = { ...opened, lines: [...order.lines, ...lines] };
    await onSave(next);
    setCart({});
    onPrint({ kind: "kot", order: next, lines, at: new Date().toISOString() });
  }

  async function pay() {
    const amountPaisa = amount.trim() ? toPaisa(amount) : bill.duePaisa;
    const tenderedPaisa = method === "cash" && tendered.trim() ? toPaisa(tendered) : null;
    if (!Number.isFinite(amountPaisa) || amountPaisa <= 0 || amountPaisa > bill.duePaisa || (tenderedPaisa !== null && tenderedPaisa < amountPaisa)) {
      setError(t("badAmount"));
      return;
    }
    setError(null);
    const id = uuid();
    await enqueue({
      key: `pay-${id}`,
      path: `/pos/orders/${order.id}/payments`,
      body: {
        id,
        method,
        amountTaka: amountPaisa / 100,
        ...(tenderedPaisa !== null ? { tenderedTaka: tenderedPaisa / 100 } : {}),
        ...(method !== "cash" && reference.trim() ? { reference: reference.trim().slice(0, 80) } : {}),
      },
      orderId: order.id,
      label: orderLabel(t, order),
    });
    if (method === "cash") openDrawerForCash();
    const closed = amountPaisa === bill.duePaisa;
    const next = { ...order, payments: [...order.payments, { method, amountPaisa, tenderedPaisa, reference: reference.trim() || null }], closed };
    await onSave(next);
    setAmount("");
    setTendered("");
    setReference("");
    if (closed) {
      onPrint({ kind: "receipt", order: next, lines: [...next.serverLines.map((l) => ({ ...l, menuItemId: "" })), ...next.lines], at: new Date().toISOString() });
      void flush();
      onBack();
    }
  }

  const change = method === "cash" && tendered.trim() ? toPaisa(tendered) - (amount.trim() ? toPaisa(amount) : bill.duePaisa) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="grid content-start gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-[14px] font-semibold ring-1 ring-zinc-200">
            <Icon name="back" className="size-4" />
            {t("back")}
          </button>
          <h2 className="text-[18px] font-bold">{orderLabel(t, order)}</h2>
          {order.tableId && order.offlineRef && <span className="text-[13px] text-zinc-500 tabular-nums">{t("billNo", { ref: order.offlineRef })}</span>}
        </div>
        {menu.map((category) => (
          <div key={category.id}>
            <h3 className="mb-1.5 text-[13px] font-bold tracking-wide text-zinc-500 uppercase">{category.name}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {category.items.map((item: MenuItem) => {
                const out = !item.isAvailable || item.stockLeft === 0;
                const q = cart[item.id] ?? 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={out}
                    onClick={() => setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }))}
                    className="relative flex min-h-16 flex-col items-start rounded-lg bg-white p-2.5 text-left ring-1 ring-zinc-200 disabled:opacity-50"
                  >
                    <span className="text-[14px] font-semibold">{item.name}</span>
                    <span className="text-[13px] text-zinc-500 tabular-nums">{out ? t("soldOut") : money(Math.round(item.priceTaka * 100))}</span>
                    {q > 0 && <span className="absolute top-1.5 right-1.5 rounded-full bg-sky-600 px-2 text-[12px] font-bold text-white">{q}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <aside className="grid content-start gap-3">
        {cartLines.length > 0 && (
          <div className="rounded-xl bg-white p-3 ring-1 ring-sky-300">
            <h3 className="text-[13px] font-bold text-sky-800">{t("newLines")}</h3>
            <ul className="mt-1.5 grid gap-1 text-[14px]">
              {cartLines.map(([id, q]) => (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span>
                    {q} × {items.get(id)?.name}
                  </span>
                  <button type="button" aria-label="−" onClick={() => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }))} className="rounded-md px-2 ring-1 ring-zinc-200">
                    <Icon name="minus" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => void send()} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 text-[14.5px] font-semibold text-white">
              <Icon name="printer" className="size-4" />
              {t("send")}
            </button>
          </div>
        )}

        <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
          <h3 className="text-[15px] font-bold">{t("bill")}</h3>
          <ul className="mt-1.5 grid gap-0.5 text-[13.5px]">
            {allLines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {l.quantity} × {l.name}
                </span>
                <span className="tabular-nums">{money(l.unitPricePaisa * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid gap-0.5 border-t pt-2 text-[13.5px]">
            <Row label={t("subtotal")} value={money(bill.netPaisa)} />
            {bill.serviceChargePaisa > 0 && <Row label={t("service")} value={money(bill.serviceChargePaisa)} />}
            {bill.vatPaisa > 0 && <Row label={t("vat")} value={money(bill.vatPaisa)} />}
            {bill.roundingPaisa !== 0 && <Row label={t("rounding")} value={money(bill.roundingPaisa)} />}
            <Row label={t("total")} value={money(bill.payablePaisa)} strong />
            {paid > 0 && <Row label={t("paid")} value={money(paid)} />}
            <Row label={t("due")} value={money(bill.duePaisa)} strong />
          </dl>
        </div>

        {bill.duePaisa > 0 && order.lines.length + order.serverLines.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void pay();
            }}
            className="grid gap-2 rounded-xl bg-primary p-3 text-primary-foreground"
          >
            <div className="grid grid-cols-4 gap-1">
              {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={cn("h-9 rounded-md text-[13px] font-semibold", method === m ? "bg-white text-zinc-900" : "bg-white/10")}>
                  {tm(m)}
                </button>
              ))}
            </div>
            <label className="grid gap-1 text-[12.5px]">
              {t("amount")}
              <input inputMode="decimal" value={amount} placeholder={String(bill.duePaisa / 100)} onChange={(e) => setAmount(e.target.value)} className="h-10 rounded-md bg-white/10 px-3 text-[15px] tabular-nums outline-none" />
            </label>
            {method === "cash" ? (
              <label className="grid gap-1 text-[12.5px]">
                {t("tendered")}
                <input inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} className="h-10 rounded-md bg-white/10 px-3 text-[15px] tabular-nums outline-none" />
                {change !== null && change >= 0 && <span className="text-[13px] font-semibold text-emerald-300">{t("change", { amount: money(change) })}</span>}
              </label>
            ) : (
              <label className="grid gap-1 text-[12.5px]">
                {t("reference")}
                <input value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} className="h-10 rounded-md bg-white/10 px-3 text-[15px] outline-none" />
              </label>
            )}
            {error && <p className="text-[13px] text-red-300" role="alert">{error}</p>}
            <button type="submit" className="h-11 rounded-lg bg-white text-[14.5px] font-semibold text-zinc-900">
              {t("pay")}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", strong && "font-bold")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Problems({ problems, snapshot, orders, onChange }: { problems: OutboxEntry[]; snapshot: Snapshot; orders: LocalOrder[]; onChange: () => void }) {
  const t = useTranslations("offline");
  const taken = new Set([
    ...snapshot.floor.areas.flatMap((a) => a.tables.filter((x) => x.order).map((x) => x.id)),
    ...orders.flatMap((o) => (!o.closed && o.tableId ? [o.tableId] : [])),
  ]);
  const free = snapshot.floor.areas.flatMap((a) => a.tables.filter((x) => !taken.has(x.id)));
  const known = ["table_busy", "item_unavailable", "idempotency_conflict", "order_closed", "drawer_off"];

  return (
    <section className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <h2 className="text-[15px] font-bold text-red-800">{t("problems")}</h2>
      <ul className="mt-2 grid gap-2">
        {problems.map((p) => (
          <li key={p.seq} className="rounded-lg bg-white p-3 text-[14px] ring-1 ring-red-100">
            <p className="font-semibold">{p.label}</p>
            <p className="text-[13.5px] text-red-700">{known.includes(p.error ?? "") ? t(`problem.${p.error}` as "problem.table_busy") : t("problem.other", { code: p.error ?? "" })}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {p.error === "table_busy" && free.length > 0 && (
                <label className="flex items-center gap-1.5 text-[13px]">
                  {t("moveTo")}
                  <select
                    className="h-9 rounded-md border px-2"
                    defaultValue=""
                    onChange={async (e) => {
                      const table = free.find((x) => x.id === e.target.value);
                      if (!table || !p.orderId) return;
                      const order = orders.find((o) => o.id === p.orderId);
                      if (order) await putOrder({ ...order, tableId: table.id, tableLabel: table.label });
                      await retry(p, { key: `${p.key}-${table.id.slice(0, 8)}`, body: { ...(p.body as object), tableId: table.id }, label: t("table", { table: table.label }) });
                      onChange();
                    }}
                  >
                    <option value="" disabled>
                      …
                    </option>
                    {free.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {p.error !== "table_busy" && (
                <button type="button" onClick={() => void retry(p).then(onChange)} className="h-9 rounded-md px-3 text-[13px] font-semibold ring-1 ring-zinc-300">
                  {t("retry")}
                </button>
              )}
              {p.orderId && (
                <button type="button" onClick={() => void discard(p.orderId!).then(onChange)} className="h-9 rounded-md bg-red-600 px-3 text-[13px] font-semibold text-white">
                  {t("discard")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CashMove() {
  const t = useTranslations("offline");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const value = Number(amount.trim());
  const valid = Number.isInteger(value) && value > 0 && reason.trim() !== "";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        const id = uuid();
        await enqueue({ key: `cash-${id}`, path: "/pos/shifts/current/cash", body: { direction, amountTaka: value, reason: reason.trim().slice(0, 120) }, orderId: null, label: t("cash") });
        openDrawerForCash();
        setAmount("");
        setReason("");
        setSaved(true);
      }}
      className="grid gap-2 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-[auto_8rem_1fr_auto] sm:items-end"
    >
      <h2 className="text-[15px] font-bold sm:col-span-4">{t("cash")}</h2>
      <div className="flex gap-1">
        {(["out", "in"] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDirection(d)} className={cn("h-10 rounded-md px-3 text-[13px] font-semibold ring-1", direction === d ? "bg-select text-white ring-select" : "ring-zinc-200")}>
            {d === "in" ? t("cashIn") : t("cashOut")}
          </button>
        ))}
      </div>
      <input aria-label={t("amount")} inputMode="numeric" placeholder="৳0" value={amount} onChange={(e) => (setAmount(e.target.value), setSaved(false))} className="h-10 rounded-md px-3 ring-1 ring-zinc-200 tabular-nums" />
      <input aria-label={t("cashReason")} placeholder={t("cashReason")} maxLength={120} value={reason} onChange={(e) => (setReason(e.target.value), setSaved(false))} className="h-10 rounded-md px-3 ring-1 ring-zinc-200" />
      <button type="submit" disabled={!valid} className="h-10 rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground disabled:opacity-50">
        OK
      </button>
      {saved && <p className="text-[13px] text-emerald-700 sm:col-span-4">{t("cashSaved")}</p>}
    </form>
  );
}

/** The printed slip: the kitchen ticket for a round, or the receipt. Only visible when printing. */
function PrintSlip({ slip, restaurant, settings, widthMm }: { slip: Slip; restaurant: string; settings: BillSettings | null; widthMm: number }) {
  const t = useTranslations("offline");
  const tm = useTranslations("paymentMethod");
  const bill = settings ? offlineBill(slip.lines, settings, 0) : null;
  const paid = slip.order.serverPaidPaisa + slip.order.payments.reduce((s, p) => s + p.amountPaisa, 0);
  return (
    // 58 mm paper prints about 48 mm wide, 80 mm paper about 72 mm.
    <div className="hidden p-2 font-mono text-[12px] text-black print:block" style={{ width: widthMm === 58 ? "48mm" : "72mm" }}>
      <p className="text-center text-[14px] font-bold">{slip.kind === "kot" ? t("kot") : restaurant}</p>
      <p className="text-center">
        {orderLabel(t, slip.order)}
        {slip.order.number ? ` · #${slip.order.number}` : ""} · {clock(slip.at)}
      </p>
      {slip.order.offlineRef && <p className="text-center font-bold">{t("billNo", { ref: slip.order.offlineRef })}</p>}
      <p className="text-center">{t("offlineNote")}</p>
      <hr className="my-1 border-dashed border-black" />
      {slip.lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-2">
          <span className={slip.kind === "kot" ? "text-[15px] font-bold" : ""}>
            {l.quantity} × {l.name}
          </span>
          {slip.kind === "receipt" && <span>{money(l.unitPricePaisa * l.quantity)}</span>}
        </div>
      ))}
      {slip.kind === "receipt" && bill && (
        <>
          <hr className="my-1 border-dashed border-black" />
          <div className="flex justify-between"><span>{t("subtotal")}</span><span>{money(bill.netPaisa)}</span></div>
          {bill.serviceChargePaisa > 0 && <div className="flex justify-between"><span>{t("service")}</span><span>{money(bill.serviceChargePaisa)}</span></div>}
          {bill.vatPaisa > 0 && <div className="flex justify-between"><span>{t("vat")}</span><span>{money(bill.vatPaisa)}</span></div>}
          <div className="flex justify-between font-bold"><span>{t("total")}</span><span>{money(bill.payablePaisa)}</span></div>
          {slip.order.payments.map((p, i) => (
            <div key={i} className="flex justify-between"><span>{tm(p.method as PaymentMethod)}</span><span>{money(p.amountPaisa)}</span></div>
          ))}
          <div className="flex justify-between"><span>{t("paid")}</span><span>{money(paid)}</span></div>
        </>
      )}
    </div>
  );
}
