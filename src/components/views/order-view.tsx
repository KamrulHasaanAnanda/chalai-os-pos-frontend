import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  approveRound,
  cancelItem,
  cancelOrder,
  mergeOrder,
  rejectRound,
  requestBill,
  serveRound,
} from "@/actions/orders";
import { Elapsed } from "@/components/elapsed";
import { Icon } from "@/components/icons";
import { OrderCartProvider, WhenCartEmpty } from "@/components/order/cart";
import { BillActions, CartPanel, OrderPanel, SendButton, UnsentTotal } from "@/components/order/cart-panel";
import { MenuPicker } from "@/components/order/menu-grid";
import { MoreMenu, type MoreAction } from "@/components/order/more-menu";
import { OrderTotals } from "@/components/order-totals";
import { CouponBox } from "@/components/coupon-box";
import { PrintKotButton } from "@/components/print/kot-printer";
import { OverrideFields } from "@/components/override-fields";
import { OrderPill, RoundPill } from "@/components/status";
import { inputClass, Notice } from "@/components/app/field";
import type { MenuCategory, Order, OrderItem, Role, Round, User } from "@/lib/api/types";
import { titleCaseLabel } from "@/lib/bill-display";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime } from "@/lib/format";
import { nestToppings } from "@/lib/modifiers";
import { orderHref } from "@/lib/paths";
import { billRoles, managerRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const fieldClass = cn(inputClass, "mt-1.5");
/** The static demo has no API to print from. */
const demo = process.env.CHALAI_DEMO === "1";

/** Touch buttons on the ticket: one shape, colour says what it does. */
const btn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14.5px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";
const btnPrimary = cn(btn, "bg-primary text-primary-foreground hover:bg-primary/90");
const btnGreen = cn(btn, "bg-emerald-600 text-white hover:bg-emerald-500");
const btnDanger = cn(btn, "border border-red-200 bg-card text-red-700 hover:border-red-400 hover:bg-red-50");
/** Small actions on a sent round (print the kitchen ticket, mark served). */
const btnSmall =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none [&_svg]:size-4";

/**
 * One order, laid out like a till: categories, the menu grid, and the order panel on the right (sent rounds, the
 * New lines, totals and the send/bill buttons). The menu and the line list scroll on their own; the panel's head
 * and footer stay put. Below 1024px the panel is a bottom sheet behind a summary bar.
 */
export function OrderView({
  order,
  menu,
  user,
  timeZone: tz,
  mergeTargets = [],
  error,
}: {
  order: Order;
  menu: MenuCategory[] | null;
  user: User;
  timeZone: string;
  /** Other open tables at this branch this order can be folded into. */
  mergeTargets?: { orderId: string; label: string; number: number; totalTaka: number }[];
  error: ErrorReader;
}) {
  const t = useTranslations("order");
  const tPicker = useTranslations("picker");
  const open = order.status === "open";
  const pending = order.rounds.filter((r) => r.status === "pending_approval");
  const others = order.rounds.filter((r) => r.status !== "pending_approval");
  const roundNumber = new Map(order.rounds.map((r, i) => [r.id, i + 1]));
  const canBill = billRoles.includes(user.role);
  const picker = open && menu !== null;
  const itemCount = order.rounds
    .filter((r) => r.status !== "rejected")
    .flatMap((r) => r.items)
    .filter((item) => !item.cancelledAt && !item.note?.startsWith("↳ "))
    .reduce((sum, item) => sum + item.quantity, 0);
  const roundsError = error.forForm("rounds") ?? error.forForm("bill") ?? error.general;
  const title = order.tableLabel
    ? t("table", { table: order.tableLabel })
    : order.tokenNo
      ? order.type === "delivery"
        ? t("delivery", { token: order.tokenNo })
        : t("pickup", { token: order.tokenNo })
      : t("takeaway");

  const moreActions: MoreAction[] = [];
  if (open && mergeTargets.length > 0)
    moreActions.push({
      id: "merge",
      label: t("mergeOrder"),
      icon: "seat",
      open: !!error.forForm("merge-order"),
      form: <MergeForm order={order} targets={mergeTargets} error={error.forForm("merge-order")} />,
    });
  if (open && order.payments.length === 0)
    moreActions.push({
      id: "cancel",
      label: t("cancelOrder"),
      icon: "ban",
      danger: true,
      open: !!error.forForm("cancel-order"),
      form: <CancelOrderForm order={order} role={user.role} error={error.forForm("cancel-order")} />,
    });

  const panel = (
    <>
      {/* Head: back, which table and order, status, timer; rare actions behind ⋯. */}
      <header className="shrink-0 border-b px-4 pt-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/floor"
            className="-ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md px-1.5 text-[13px] font-semibold text-zinc-600 hover:bg-muted hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
          >
            <Icon name="back" className="size-4" />
            {t("backToFloor")}
          </Link>
          <MoreMenu actions={moreActions} />
        </div>
        <h1 className="mt-0.5 text-[19px] leading-tight font-bold tracking-tight">
          {title}
          <span className="font-semibold text-muted-foreground">
            {[order.areaName, t("number", { number: order.number })]
              .filter(Boolean)
              .map((part) => ` · ${part}`)
              .join("")}
          </span>
        </h1>
        {(order.guestName || order.guestPhone) && (
          <p className="truncate text-[13px] text-muted-foreground">
            {[order.guestName, order.guestPhone].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold">
          <OrderPill status={order.status} />
          {open ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-zinc-700 tabular-nums">
              <Icon name="clock" className="size-3.5" />
              <span className="sr-only">{t("openFor")}</span>
              <Elapsed since={order.openedAt} />
            </span>
          ) : (
            order.closedAt && (
              <span className="text-muted-foreground">{t("closedAt", { time: formatTime(order.closedAt, tz) })}</span>
            )
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-zinc-700 tabular-nums">
            <Icon name="utensils" className="size-3.5" />
            {t("itemsCount", { n: itemCount })}
          </span>
        </div>
      </header>

      {/* Only the lines scroll; head and footer stay put. */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
        {order.billRequestedAt && open && (
          <Notice tone="info">{t("billRequested", { time: formatTime(order.billRequestedAt, tz) })}</Notice>
        )}
        {roundsError && <Notice>{roundsError}</Notice>}
        {order.type === "delivery" && order.delivery && (
          <section className="rounded-xl bg-card p-3 text-[14px] ring-1 ring-emerald-200">
            <p className="text-[12.5px] font-semibold text-emerald-800">{t("deliverTo")}</p>
            <p className="mt-0.5 font-medium">{order.delivery.address}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {order.pickupAt && <span>{t("deliverAt", { time: formatTime(order.pickupAt, tz) })}</span>}
              <span className="font-semibold text-foreground">
                {order.delivery.payMethod === "bkash" ? t("payBkash") : t("payCash")}
              </span>
              {order.delivery.feeTaka > 0 && (
                <span>{t("deliveryFee", { amount: formatTaka(order.delivery.feeTaka) })}</span>
              )}
            </p>
          </section>
        )}

        {pending.map((round) => (
          <article key={round.id} className="overflow-hidden rounded-xl border-2 border-orange-400 bg-card">
            <p className="flex items-center gap-2 bg-orange-500 px-3 py-1.5 text-[13px] font-bold text-white">
              <Icon name="bell" className="size-4 animate-pulse motion-reduce:animate-none" />
              {t("pendingTitle", { n: 1 })}
            </p>
            <div className="p-3">
              <RoundHeader round={round} index={roundNumber.get(round.id) ?? 0} tz={tz} />
              <ItemList order={order} round={round} role={user.role} error={error} />
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
                  <details open={!!error.forForm(`reject-${round.id}`)} id={`reject-${round.id}`}>
                    <summary className={cn(btnDanger, "h-10 w-full cursor-pointer list-none")}>
                      <Icon name="x" />
                      {t("reject")}
                    </summary>
                    <form action={rejectRound} className="mt-2 rounded-lg bg-red-50 p-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="roundId" value={round.id} />
                      {error.forForm(`reject-${round.id}`) && <Notice>{error.forForm(`reject-${round.id}`)}</Notice>}
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
                      <button type="submit" className={cn(btnDanger, "mt-2 w-full")}>
                        {t("confirmReject")}
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </div>
          </article>
        ))}

        {others.map((round) => {
          const canServe =
            open &&
            (round.status === "ready" ||
              ((round.status === "queued" || round.status === "preparing") && managerRoles.includes(user.role)));
          return (
            <section key={round.id} aria-label={t("sentRound", { n: roundNumber.get(round.id) ?? 0 })}>
              <RoundHeader round={round} index={roundNumber.get(round.id) ?? 0} tz={tz} />
              {round.rejectedReason && (
                <p className="mt-1 text-[13.5px] text-late">{t("rejectedBecause", { reason: round.rejectedReason })}</p>
              )}
              <ItemList order={order} round={round} role={user.role} error={error} />
              {((!demo && round.status !== "rejected") || canServe) && (
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  {!demo && round.status !== "rejected" && (
                    <PrintKotButton roundId={round.id} className={cn(btnSmall, "text-zinc-700 hover:bg-muted")}>
                      <Icon name="printer" />
                      {t("printKotShort")}
                    </PrintKotButton>
                  )}
                  {canServe && (
                    <form action={serveRound}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="roundId" value={round.id} />
                      <button
                        type="submit"
                        className={cn(
                          btnSmall,
                          round.status === "ready"
                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                            : "text-zinc-700 hover:bg-muted",
                        )}
                      >
                        <Icon name="serve" />
                        {t("served")}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {picker && <CartPanel />}

        {others.length === 0 && pending.length === 0 && (
          <WhenCartEmpty>
            <p className="flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 text-[13.5px] text-muted-foreground">
              <Icon name="utensils" className="size-4 shrink-0" />
              {picker ? tPicker("emptyLine") : t("noRounds")}
            </p>
          </WhenCartEmpty>
        )}
      </div>

      {/* Totals and actions, always in view. */}
      <footer className="shrink-0 space-y-3 border-t bg-card p-3">
        {canBill && open && itemCount > 0 && <CouponBox order={order} error={error} />}
        <div className="space-y-1">
          {/* Paid and due only matter once part of the bill is paid. */}
          <OrderTotals order={order} compact billSummary={order.paidTaka === 0} />
          <UnsentTotal />
        </div>
        {picker && <SendButton />}
        {open && (
          <BillActions
            orderId={order.id}
            requestBill={requestBill}
            showRequest={!order.billRequestedAt}
            billHref={canBill ? orderHref(order.id, "bill") : null}
            hasItems={itemCount > 0}
          />
        )}
        {order.status === "paid" && canBill && (
          <Link href={orderHref(order.id, "receipt")} className={cn(btnPrimary, "w-full")}>
            <Icon name="printer" />
            {t("receipt")}
          </Link>
        )}
      </footer>
    </>
  );

  if (!picker)
    return (
      <div className="mx-auto max-w-[560px]">
        <section
          aria-label={t("ticket")}
          className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs"
        >
          {panel}
        </section>
      </div>
    );

  return (
    <OrderCartProvider orderId={order.id} menu={menu}>
      {/* Menu (categories + grid) | order panel. Full height on tablets and laptops; each part scrolls on its own. */}
      <div className="md:h-[calc(100dvh-7.5rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 md:h-full md:min-h-0">
          <MenuPicker />
        </div>
        <OrderPanel label={t("ticket")} sentCount={itemCount} sentTotal={order.totalTaka}>
          {panel}
        </OrderPanel>
      </div>
    </OrderCartProvider>
  );
}

function MergeForm({
  order,
  targets,
  error,
}: {
  order: Order;
  targets: { orderId: string; label: string; number: number; totalTaka: number }[];
  error?: string;
}) {
  const t = useTranslations("order");
  return (
    <form action={mergeOrder} className="grid gap-3">
      <input type="hidden" name="orderId" value={order.id} />
      <p className="text-[14px] text-muted-foreground">{t("mergeBody", { table: order.tableLabel ?? "" })}</p>
      {error && <Notice>{error}</Notice>}
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-[14px] font-semibold">{t("mergeInto")}</legend>
        {targets.map((m) => (
          <label
            key={m.orderId}
            className="flex h-12 cursor-pointer items-center gap-3 rounded-lg border border-input bg-card px-3 text-[14px] has-[:checked]:border-select has-[:checked]:bg-select/5"
          >
            <input type="radio" name="intoOrderId" value={m.orderId} required className="size-4 accent-[var(--select)]" />
            <span className="flex-1 font-semibold">{m.label}</span>
            <span className="text-muted-foreground tabular-nums">
              #{m.number} · {formatTaka(m.totalTaka)}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-[13px] text-muted-foreground">{t("mergeWarning")}</p>
      <button type="submit" className={cn(btnPrimary, "w-full")}>
        {t("confirmMerge")}
      </button>
    </form>
  );
}

function CancelOrderForm({ order, role, error }: { order: Order; role: Role; error?: string }) {
  const t = useTranslations("order");
  return (
    <form action={cancelOrder} className="grid gap-3">
      <input type="hidden" name="orderId" value={order.id} />
      <p className="text-[14px] text-muted-foreground">{t("cancelOrderBody")}</p>
      {error && <Notice>{error}</Notice>}
      <label className="block text-[14px] font-semibold">
        {t("cancelReason")}
        <input name="reason" required maxLength={200} placeholder={t("cancelOrderPlaceholder")} className={fieldClass} />
      </label>
      <OverrideFields role={role} idPrefix="cancel-order" />
      <button type="submit" className={cn(btnDanger, "w-full")}>
        {t("confirmCancelOrder")}
      </button>
    </form>
  );
}

/** A divider above each sent round: its number, where it came from, when, and where it is in the kitchen. */
function RoundHeader({ round, index, tz }: { round: Round; index: number; tz: string }) {
  const t = useTranslations("order");
  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="shrink-0 text-[13px] font-semibold text-zinc-800">{t("round", { n: index })}</h3>
        <span className="min-w-0 truncate text-[12.5px] text-muted-foreground">
          {[round.source === "qr" ? t("fromQr") : t("fromPos"), formatTime(round.createdAt, tz), round.createdBy?.name]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="h-px min-w-3 flex-1 bg-border" aria-hidden />
        <RoundPill status={round.status} />
      </div>
      {round.note && (
        <p className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[13.5px] font-medium text-amber-900">
          {t("note", { note: round.note })}
        </p>
      )}
    </div>
  );
}

function ItemList({ order, round, role, error }: { order: Order; round: Round; role: Role; error: ErrorReader }) {
  const cancellable = order.status === "open" && round.status !== "pending_approval" && round.status !== "rejected";
  return (
    <ul className="mt-1 divide-y divide-line">
      {nestToppings(round.items).map(({ item, toppings }) => (
        <ItemRow
          key={item.id}
          order={order}
          item={item}
          toppings={toppings}
          role={role}
          cancellable={cancellable}
          error={error}
        />
      ))}
    </ul>
  );
}

/** A sent line: qty × name, its toppings indented under it, note, total, and a trash button to cancel it. */
function ItemRow({
  order,
  item,
  toppings,
  role,
  cancellable,
  error,
}: {
  order: Order;
  item: OrderItem;
  toppings: OrderItem[];
  role: Role;
  cancellable: boolean;
  error: ErrorReader;
}) {
  const t = useTranslations("order");
  const name = titleCaseLabel(item.name);
  return (
    <li className="py-2">
      <SentLine order={order} item={item} name={name} role={role} cancellable={cancellable} error={error} />
      {toppings.length > 0 && (
        <ul className="mt-1 ml-9 border-l-2 border-zinc-200 pl-2.5">
          {toppings.map((x) => (
            <li key={x.id}>
              <SentLine
                order={order}
                item={x}
                name={`+ ${titleCaseLabel(x.name)}`}
                role={role}
                cancellable={cancellable}
                error={error}
                topping
              />
            </li>
          ))}
        </ul>
      )}
      {item.cancelledAt && (
        <p className="mt-0.5 ml-9 text-[13px] font-semibold text-late">
          {t("cancelled", { reason: item.cancelReason ?? "" })}
        </p>
      )}
    </li>
  );
}

function SentLine({
  order,
  item,
  name,
  role,
  cancellable,
  error,
  topping = false,
}: {
  order: Order;
  item: OrderItem;
  name: string;
  role: Role;
  cancellable: boolean;
  error: ErrorReader;
  topping?: boolean;
}) {
  const t = useTranslations("order");
  const formError = error.forForm(`cancel-${item.id}`);
  const off = !!item.cancelledAt;
  // A topping's note only says which dish it is for (shown by the indent).
  const note = topping ? null : item.note;
  return (
    <div>
      <div className="flex items-start gap-2">
        {!topping && (
          <span className="mt-px flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1 text-[13px] font-bold tabular-nums">
            {item.quantity}×
          </span>
        )}
        <div className={cn("min-w-0 flex-1", off && "text-muted-foreground line-through")}>
          <p className={cn(topping ? "text-[13.5px] text-zinc-700" : "text-[14.5px] font-semibold")}>{name}</p>
          {note && <p className="text-[13px] font-medium text-amber-800 no-underline">{note}</p>}
        </div>
        <span
          className={cn(
            "shrink-0 pt-px tabular-nums",
            topping ? "text-[13.5px] text-zinc-700" : "text-[14px] font-semibold",
            off && "text-muted-foreground line-through",
          )}
        >
          {formatTaka(item.lineTotalTaka)}
        </span>
        {cancellable && !off && (
          <details id={`cancel-${item.id}`} open={!!formError} className="group -my-1.5 shrink-0">
            <summary
              aria-label={t("removeItem", { name })}
              title={t("cancelItem")}
              className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-700 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none group-open:bg-red-50 group-open:text-red-700 [&::-webkit-details-marker]:hidden"
            >
              <Icon name="trash" className="size-4" />
            </summary>
          </details>
        )}
      </div>
      {cancellable && !off && (
        // The cancel form sits under the line; it opens with the trash button (same <details> id via CSS sibling).
        <CancelItemForm order={order} item={item} name={name} role={role} formError={formError} />
      )}
    </div>
  );
}

function CancelItemForm({
  order,
  item,
  name,
  role,
  formError,
}: {
  order: Order;
  item: OrderItem;
  name: string;
  role: Role;
  formError?: string;
}) {
  const t = useTranslations("order");
  return (
    <form
      action={cancelItem}
      className={cn(
        "mt-2 rounded-lg bg-red-50/70 p-3 ring-1 ring-red-100",
        // Shown while the trash <details> just above is open.
        !formError && "hidden [div:has(>div>details[open])>&]:block",
      )}
    >
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="itemId" value={item.id} />
      {formError && <Notice>{formError}</Notice>}
      <label className="block text-[14px] font-semibold">
        {t("cancelReason")}
        <input name="reason" required maxLength={200} placeholder={t("cancelPlaceholder")} className={fieldClass} />
      </label>
      <OverrideFields role={role} idPrefix={`c-${item.id}`} />
      <button type="submit" className={cn(btnDanger, "mt-3 h-11 w-full")}>
        {t("confirmCancel", { name })}
      </button>
    </form>
  );
}
