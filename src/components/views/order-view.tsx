import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  approveRound,
  cancelItem,
  cancelOrder,
  rejectRound,
  requestBill,
  serveRound,
} from "@/actions/orders";
import { Elapsed } from "@/components/elapsed";
import { Icon } from "@/components/icons";
import { MenuPicker } from "@/components/menu-picker";
import { OrderTotals } from "@/components/order-totals";
import { OverrideFields } from "@/components/override-fields";
import { OrderPill, RoundPill } from "@/components/status";
import { inputClass, Notice } from "@/components/app/field";
import { Segmented } from "@/components/app/segmented";
import type {
  MenuCategory,
  Order,
  OrderItem,
  Role,
  Round,
  User,
} from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime } from "@/lib/format";
import { orderHref, withParams } from "@/lib/paths";
import { billRoles, managerRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const fieldClass = cn(inputClass, "mt-1.5");

/** Colour strip on top of each round, by where it is in the kitchen. */
const ROUND_STRIP: Record<Round["status"], string> = {
  pending_approval: "bg-orange-500",
  rejected: "bg-red-500",
  queued: "bg-zinc-400",
  preparing: "bg-blue-600",
  ready: "bg-emerald-600",
  served: "bg-zinc-900",
};

/** Big touch buttons used across the order ticket: one shape, colour says what it does. */
const btn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";
const btnPrimary = cn(
  btn,
  "bg-orange-600 text-white shadow-sm hover:bg-orange-500",
);
const btnDark = cn(btn, "bg-zinc-900 text-white hover:bg-zinc-800");
const btnGreen = cn(btn, "bg-emerald-600 text-white hover:bg-emerald-500");
const btnOutline = cn(
  btn,
  "border border-zinc-300 bg-card text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50",
);
const btnDanger = cn(
  btn,
  "border border-red-200 bg-card text-red-700 hover:border-red-400 hover:bg-red-50",
);

/**
 * One order, laid out like a till: the menu fills the screen and the order ticket sits on the right (rounds, totals,
 * bill buttons). Each side scrolls on its own. On phones the menu is behind the "Add items" tab (?tab=add).
 */
export function OrderView({
  order,
  menu,
  user,
  timeZone: tz,
  error,
}: {
  order: Order;
  menu: MenuCategory[] | null;
  user: User;
  timeZone: string;
  error: ErrorReader;
}) {
  const t = useTranslations("order");
  const open = order.status === "open";
  const pending = order.rounds.filter((r) => r.status === "pending_approval");
  const others = order.rounds.filter((r) => r.status !== "pending_approval");
  const roundNumber = new Map(order.rounds.map((r, i) => [r.id, i + 1]));
  const canBill = billRoles.includes(user.role);
  const picker = open && menu !== null;
  const adding = picker && error.param("tab") === "add";
  const itemCount = order.rounds
    .filter((r) => r.status !== "rejected")
    .flatMap((r) => r.items)
    .filter((item) => !item.cancelledAt)
    .reduce((sum, item) => sum + item.quantity, 0);
  const roundsError =
    error.forForm("rounds") ?? error.forForm("bill") ?? error.general;
  const showBillButtons =
    (canBill && open) ||
    (open && !order.billRequestedAt) ||
    (order.status === "paid" && canBill);

  const ticket = (
    <section
      aria-label={t("ticket")}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
        picker && "lg:h-full",
        adding && "max-lg:hidden",
      )}
    >
      {/* Dark ticket head: back, table, order number, timer and what's due. */}
      <header className="relative shrink-0 overflow-hidden bg-zinc-900 px-4 pt-3 pb-4 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-orange-500/25 blur-3xl"
        />
        <Link
          href="/floor"
          className="relative -ml-1.5 inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-[13px] font-semibold text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <Icon name="back" className="size-4" />
          {t("backToFloor")}
        </Link>
        <div className="relative mt-1.5 flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-[22px] font-bold",
              order.tableLabel
                ? "bg-orange-500 text-white"
                : "bg-white text-zinc-900",
            )}
          >
            {order.tableLabel ?? <Icon name="bag" className="size-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] leading-tight font-bold tracking-tight">
              {order.tableLabel
                ? t("table", { table: order.tableLabel })
                : t("takeaway")}
            </h1>
            <p className="truncate text-[12.5px] text-zinc-400">
              {[
                order.areaName,
                t("number", { number: order.number }),
                order.guestName,
                order.guestPhone,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
              {open ? t("dueNow") : t("totalLabel")}
            </p>
            <p className="text-[24px] leading-tight font-bold tabular-nums">
              {formatTaka(open ? order.dueTaka : order.totalTaka)}
            </p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold">
          <OrderPill status={order.status} />
          {open ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 tabular-nums">
              <Icon name="clock" className="size-3.5" />
              <span className="sr-only">{t("openFor")}</span>
              <Elapsed since={order.openedAt} />
            </span>
          ) : (
            order.closedAt && (
              <span className="text-zinc-400">
                {t("closedAt", { time: formatTime(order.closedAt, tz) })}
              </span>
            )
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 tabular-nums">
            <Icon name="utensils" className="size-3.5" />
            {t("itemsCount", { n: itemCount })}
          </span>
        </div>
      </header>

      {/* The ticket body scrolls; head and bill buttons stay put. */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-50/70 p-3">
        {order.billRequestedAt && open && (
          <Notice tone="info">
            {t("billRequested", {
              time: formatTime(order.billRequestedAt, tz),
            })}
          </Notice>
        )}
        {roundsError && <Notice>{roundsError}</Notice>}

        {pending.map((round) => (
          <article
            key={round.id}
            className="overflow-hidden rounded-xl border-2 border-orange-400 bg-card"
          >
            <p className="flex items-center gap-2 bg-orange-500 px-3 py-1.5 text-[13px] font-bold text-white">
              <Icon name="bell" className="size-4 animate-pulse" />
              {t("pendingTitle", { n: 1 })}
            </p>
            <div className="p-3">
              <RoundHeader
                round={round}
                index={roundNumber.get(round.id) ?? 0}
                tz={tz}
              />
              <ItemList
                order={order}
                round={round}
                role={user.role}
                error={error}
              />
              {open && (
                <div className="mt-2 space-y-2">
                  <form action={approveRound}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="roundId" value={round.id} />
                    <button type="submit" className={cn(btnGreen, "w-full")}>
                      <Icon name="check" />
                      {t("approve")}
                    </button>
                  </form>
                  <details
                    open={!!error.forForm(`reject-${round.id}`)}
                    id={`reject-${round.id}`}
                  >
                    <summary
                      className={cn(
                        btnDanger,
                        "h-10 w-full cursor-pointer list-none",
                      )}
                    >
                      <Icon name="x" />
                      {t("reject")}
                    </summary>
                    <form
                      action={rejectRound}
                      className="mt-2 rounded-lg bg-red-50 p-3"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="roundId" value={round.id} />
                      {error.forForm(`reject-${round.id}`) && (
                        <Notice>{error.forForm(`reject-${round.id}`)}</Notice>
                      )}
                      <label className="block text-[14px] font-semibold">
                        {t("rejectReason")}
                        <input
                          name="reason"
                          required
                          maxLength={200}
                          placeholder={t("rejectPlaceholder")}
                          className={fieldClass}
                        />
                      </label>
                      <button
                        type="submit"
                        className={cn(btnDanger, "mt-2 w-full")}
                      >
                        {t("confirmReject")}
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </div>
          </article>
        ))}

        {others.length === 0 && pending.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-zinc-300 bg-card px-5 py-8 text-center">
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600"
            >
              <Icon name="utensils" className="size-6" />
            </span>
            <p className="mt-2.5 text-[15px] font-bold">{t("emptyTitle")}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {picker ? t("noRoundsPicker") : t("noRounds")}
            </p>
          </div>
        )}

        {others.map((round) => {
          const canServe =
            open &&
            (round.status === "ready" ||
              ((round.status === "queued" || round.status === "preparing") &&
                managerRoles.includes(user.role)));
          return (
            <article
              key={round.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div
                className={cn("h-1", ROUND_STRIP[round.status])}
                aria-hidden
              />
              <div className="p-3">
                <RoundHeader
                  round={round}
                  index={roundNumber.get(round.id) ?? 0}
                  tz={tz}
                />
                {round.rejectedReason && (
                  <p className="mt-1 text-[14px] text-late">
                    {t("rejectedBecause", { reason: round.rejectedReason })}
                  </p>
                )}
                <ItemList
                  order={order}
                  round={round}
                  role={user.role}
                  error={error}
                />
                {canServe && (
                  <form action={serveRound} className="mt-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="roundId" value={round.id} />
                    <button
                      type="submit"
                      className={cn(
                        round.status === "ready" ? btnGreen : btnOutline,
                        "h-10 w-full",
                      )}
                    >
                      <Icon name="serve" />
                      {t("served")}
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}

        {open && order.payments.length === 0 && (
          <details
            id="cancel-order"
            open={!!error.forForm("cancel-order")}
            className="group rounded-xl"
          >
            <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-red-600 hover:bg-red-50">
              <Icon name="ban" className="size-4" />
              {t("cancelOrder")}
            </summary>
            <form
              action={cancelOrder}
              className="mt-1 rounded-xl border border-red-200 bg-card p-3"
            >
              <input type="hidden" name="orderId" value={order.id} />
              <p className="text-[13.5px] text-muted-foreground">
                {t("cancelOrderBody")}
              </p>
              {error.forForm("cancel-order") && (
                <div className="mt-2">
                  <Notice>{error.forForm("cancel-order")}</Notice>
                </div>
              )}
              <label className="mt-2 block text-[14px] font-semibold">
                {t("cancelReason")}
                <input
                  name="reason"
                  required
                  maxLength={200}
                  placeholder={t("cancelOrderPlaceholder")}
                  className={fieldClass}
                />
              </label>
              <OverrideFields role={user.role} idPrefix="cancel-order" />
              <button type="submit" className={cn(btnDanger, "mt-3 w-full")}>
                {t("confirmCancelOrder")}
              </button>
            </form>
          </details>
        )}
      </div>

      {/* Totals and the bill buttons, always in view at the bottom of the ticket. */}
      <footer className="shrink-0 border-t bg-card p-3">
        <OrderTotals order={order} compact />
        {(showBillButtons || picker) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {picker && (
              <Link
                href={withParams(orderHref(order.id), { tab: "add" })}
                className={cn(btnDark, "col-span-2 lg:hidden")}
              >
                <Icon name="plus" />
                {t("addItems")}
              </Link>
            )}
            {open && !order.billRequestedAt && (
              <form
                action={requestBill}
                className={cn(!(canBill && open) && "col-span-2")}
              >
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className={cn(btnOutline, "w-full")}>
                  <Icon name="receipt" />
                  {t("requestBill")}
                </button>
              </form>
            )}
            {canBill && open && (
              <Link
                href={orderHref(order.id, "bill")}
                className={cn(
                  btnPrimary,
                  order.billRequestedAt && "col-span-2",
                )}
              >
                <Icon name="cash" />
                {t("openBill")}
              </Link>
            )}
            {order.status === "paid" && canBill && (
              <Link
                href={orderHref(order.id, "receipt")}
                className={cn(btnDark, "col-span-2")}
              >
                <Icon name="printer" />
                {t("receipt")}
              </Link>
            )}
          </div>
        )}
      </footer>
    </section>
  );

  if (!picker) return <div className="mx-auto max-w-[560px]">{ticket}</div>;

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Phones: switch between the order and the menu. */}
      <Segmented
        label={t("tabs.label")}
        className="mb-3 lg:hidden"
        items={[
          {
            href: orderHref(order.id),
            label: t("tabs.order"),
            active: !adding,
          },
          {
            href: withParams(orderHref(order.id), { tab: "add" }),
            label: t("tabs.add"),
            active: adding,
          },
        ]}
      />
      <div className="lg:grid lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div
          id="picker"
          className={cn(
            "max-lg:pb-40 lg:h-full lg:min-h-0",
            !adding && "max-lg:hidden",
          )}
        >
          <MenuPicker orderId={order.id} menu={menu} />
        </div>
        {ticket}
      </div>
    </div>
  );
}

function RoundHeader({
  round,
  index,
  tz,
}: {
  round: Round;
  index: number;
  tz: string;
}) {
  const t = useTranslations("order");
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[17px] font-semibold">
        {t("round", { n: index })}
        <span className="ml-2 text-[14.5px] font-semibold text-muted-foreground">
          {[
            round.source === "qr" ? t("fromQr") : t("fromPos"),
            formatTime(round.createdAt, tz),
            round.createdBy?.name,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </h3>
      <RoundPill status={round.status} />
      {round.note && (
        <p className="w-full rounded-md bg-amber-50 px-3 py-1.5 text-[14px] font-medium text-amber-900">
          {t("note", { note: round.note })}
        </p>
      )}
    </div>
  );
}

function ItemList({
  order,
  round,
  role,
  error,
}: {
  order: Order;
  round: Round;
  role: Role;
  error: ErrorReader;
}) {
  const cancellable =
    order.status === "open" &&
    round.status !== "pending_approval" &&
    round.status !== "rejected";
  return (
    <ul className="mt-2 divide-y divide-line">
      {round.items.map((item) => (
        <ItemRow
          key={item.id}
          order={order}
          item={item}
          role={role}
          cancellable={cancellable && !item.cancelledAt}
          error={error}
        />
      ))}
    </ul>
  );
}

function ItemRow({
  order,
  item,
  role,
  cancellable,
  error,
}: {
  order: Order;
  item: OrderItem;
  role: Role;
  cancellable: boolean;
  error: ErrorReader;
}) {
  const t = useTranslations("order");
  const formError = error.forForm(`cancel-${item.id}`);
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "min-w-0",
            item.cancelledAt && "text-muted-foreground line-through",
          )}
        >
          <p className="flex items-center gap-2.5 text-[16px] font-semibold">
            <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1.5 text-[13.5px] font-bold tabular-nums">
              {item.quantity}×
            </span>
            <span className="min-w-0">{item.name}</span>
          </p>
          {item.note && (
            <p className="text-[14px] font-medium text-amber-800 no-underline">
              {item.note}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 font-semibold tabular-nums",
            item.cancelledAt && "text-muted-foreground line-through",
          )}
        >
          {formatTaka(item.lineTotalTaka)}
        </span>
      </div>
      {item.cancelledAt && (
        <p className="text-[14.5px] font-semibold text-late">
          {t("cancelled", { reason: item.cancelReason ?? "" })}
        </p>
      )}
      {cancellable && (
        <details id={`cancel-${item.id}`} open={!!formError} className="mt-1">
          <summary className="inline-flex min-h-12 cursor-pointer items-center rounded-lg px-2 text-[14px] font-medium text-late hover:bg-late/5">
            {t("cancelItem")}
          </summary>
          <form action={cancelItem} className="mt-1 rounded-md bg-gray/60 p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="itemId" value={item.id} />
            {formError && <Notice>{formError}</Notice>}
            <label className="mt-2 block text-[15.5px] font-semibold">
              {t("cancelReason")}
              <input
                name="reason"
                required
                maxLength={200}
                placeholder={t("cancelPlaceholder")}
                className={fieldClass}
              />
            </label>
            <OverrideFields role={role} idPrefix={`c-${item.id}`} />
            <button type="submit" className={cn(btnDanger, "mt-3 w-full")}>
              {t("confirmCancel", { name: item.name })}
            </button>
          </form>
        </details>
      )}
    </li>
  );
}
