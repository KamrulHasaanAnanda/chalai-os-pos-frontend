import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { approveRound, cancelItem, cancelOrder, rejectRound, requestBill, serveRound } from "@/actions/orders";
import { Elapsed } from "@/components/elapsed";
import { cardClass, fieldClass, Notice } from "@/components/form";
import { Icon } from "@/components/icons";
import { OrderTotals } from "@/components/order-totals";
import { OverrideFields } from "@/components/override-fields";
import { Chip, RoundChip } from "@/components/status";
import { buttonVariants } from "@/components/ui/button-variants";
import type { Order, OrderItem, Role, Round } from "@/lib/api/types";
import { readError } from "@/lib/errors";
import { formatTaka, formatTime } from "@/lib/format";
import { getOrder } from "@/lib/data";
import { billRoles, floorRoles, managerRoles, requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  const t = await getTranslations("order");
  const order = await getOrder((await params).id);
  return { title: t("title", { number: order.number }) };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const { user, restaurant } = await requireStaff({ roles: floorRoles });
  const order = await getOrder(id);
  const t = await getTranslations("order");
  const tStatus = await getTranslations("orderStatus");
  const error = await readError(searchParams);
  const added = (await searchParams).added === "1";
  const tz = restaurant.timezone;

  const open = order.status === "open";
  const pending = order.rounds.filter((r) => r.status === "pending_approval");
  const others = order.rounds.filter((r) => r.status !== "pending_approval");
  const roundNumber = new Map(order.rounds.map((r, i) => [r.id, i + 1]));
  const canBill = billRoles.includes(user.role);

  return (
    <div id="top" className="mx-auto max-w-[960px] space-y-4">
      <Link href="/floor" className="inline-flex min-h-12 items-center gap-1 text-[15.5px] font-bold text-maroon">
        <Icon name="back" />
        {t("backToFloor")}
      </Link>

      <header className={cn(cardClass, "flex flex-wrap items-center justify-between gap-3")}>
        <div className="min-w-0">
          <h1 className="font-heading text-[28px] leading-tight font-extrabold sm:text-[34px]">
            {order.tableLabel ? t("table", { table: order.tableLabel }) : t("takeaway")}
          </h1>
          <p className="mt-0.5 text-[16px] text-muted-foreground">
            {[order.areaName, t("number", { number: order.number }), order.guestName, order.guestPhone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={open ? "warn" : order.status === "paid" ? "ok" : "late"}>{tStatus(order.status)}</Chip>
          {open ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray px-3 py-1 text-[15.5px] font-bold tabular-nums">
              <Icon name="clock" className="size-4" />
              <span className="sr-only">{t("openFor")}</span>
              <Elapsed since={order.openedAt} />
            </span>
          ) : (
            order.closedAt && <span className="text-[15px] text-muted-foreground">{t("closedAt", { time: formatTime(order.closedAt, tz) })}</span>
          )}
        </div>
      </header>

      {added && <Notice tone="ok">{t("added")}</Notice>}
      {order.billRequestedAt && open && <Notice tone="info">{t("billRequested", { time: formatTime(order.billRequestedAt, tz) })}</Notice>}
      {(error.forForm("rounds") ?? error.forForm("bill") ?? error.general) && (
        <Notice>{error.forForm("rounds") ?? error.forForm("bill") ?? error.general}</Notice>
      )}

      <div className="flex flex-wrap gap-2">
        {open && (
          <Link href={`/orders/${order.id}/add`} className={buttonVariants({ variant: "sun", size: "pill" })}>
            <Icon name="plus" />
            {t("addItems")}
          </Link>
        )}
        {open && !order.billRequestedAt && (
          <form action={requestBill}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className={buttonVariants({ variant: "soft", size: "pill" })}>
              <Icon name="receipt" />
              {t("requestBill")}
            </button>
          </form>
        )}
        {canBill && open && (
          <Link href={`/orders/${order.id}/bill`} className={buttonVariants({ variant: "dark", size: "pill" })}>
            <Icon name="receipt" />
            {t("openBill")}
          </Link>
        )}
        {order.status === "paid" && (
          <Link href={`/orders/${order.id}/receipt`} className={buttonVariants({ variant: "soft", size: "pill" })}>
            <Icon name="printer" />
            {t("receipt")}
          </Link>
        )}
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="pending-title" className="space-y-3">
          <h2 id="pending-title" className="flex items-center gap-2 text-[20px] font-extrabold">
            <Icon name="bell" className="size-6 text-brand" />
            {t("pendingTitle", { n: pending.length })}
          </h2>
          {pending.map((round) => (
            <article key={round.id} className={cn(cardClass, "border-2 border-sun bg-sun-tint/40")}>
              <RoundHeader round={round} index={roundNumber.get(round.id) ?? 0} tz={tz} />
              <ItemList order={order} round={round} role={user.role} error={error} />
              {open && (
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <form action={approveRound}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="roundId" value={round.id} />
                    <button type="submit" className={buttonVariants({ variant: "default", size: "pill" })}>
                      <Icon name="check" />
                      {t("approve")}
                    </button>
                  </form>
                  <details className="group min-w-[240px] flex-1" open={!!error.forForm(`reject-${round.id}`)} id={`reject-${round.id}`}>
                    <summary className={cn(buttonVariants({ variant: "destructive", size: "pill" }), "w-fit")}>
                      <Icon name="x" />
                      {t("reject")}
                    </summary>
                    <form action={rejectRound} className="mt-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="roundId" value={round.id} />
                      {error.forForm(`reject-${round.id}`) && <Notice>{error.forForm(`reject-${round.id}`)}</Notice>}
                      <label className="mt-2 block text-[15.5px] font-bold">
                        {t("rejectReason")}
                        <input name="reason" required maxLength={200} placeholder={t("rejectPlaceholder")} className={fieldClass} />
                      </label>
                      <button type="submit" className={cn(buttonVariants({ variant: "destructive", size: "pillSm" }), "mt-2")}>
                        {t("confirmReject")}
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="rounds-title" className="space-y-3">
        <h2 id="rounds-title" className="text-[20px] font-extrabold">
          {t("roundsTitle")}
        </h2>
        {others.length === 0 && <p className="text-muted-foreground">{t("noRounds")}</p>}
        {others.map((round) => {
          const canServe =
            open &&
            (round.status === "ready" ||
              ((round.status === "queued" || round.status === "preparing") && managerRoles.includes(user.role)));
          return (
            <article key={round.id} className={cn(cardClass, round.status === "ready" && "ring-2 ring-ok")}>
              <RoundHeader round={round} index={roundNumber.get(round.id) ?? 0} tz={tz} />
              {round.rejectedReason && <p className="mt-1 text-[15px] text-late">{t("rejectedBecause", { reason: round.rejectedReason })}</p>}
              <ItemList order={order} round={round} role={user.role} error={error} />
              {canServe && (
                <form action={serveRound} className="mt-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="roundId" value={round.id} />
                  <button
                    type="submit"
                    className={buttonVariants({ variant: round.status === "ready" ? "default" : "soft", size: "pill" })}
                  >
                    <Icon name="check" />
                    {t("served")}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </section>

      <section aria-label={t("totalsTitle")} className={cardClass}>
        <OrderTotals order={order} />
      </section>

      {open && order.payments.length === 0 && (
        <details id="cancel-order" open={!!error.forForm("cancel-order")} className={cardClass}>
          <summary className="inline-flex min-h-12 items-center text-[15.5px] font-bold text-late">{t("cancelOrder")}</summary>
          <form action={cancelOrder} className="mt-1">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-[14.5px] text-muted-foreground">{t("cancelOrderBody")}</p>
            {error.forForm("cancel-order") && (
              <div className="mt-2">
                <Notice>{error.forForm("cancel-order")}</Notice>
              </div>
            )}
            <label className="mt-2 block text-[15.5px] font-bold">
              {t("cancelReason")}
              <input name="reason" required maxLength={200} placeholder={t("cancelOrderPlaceholder")} className={fieldClass} />
            </label>
            <OverrideFields role={user.role} idPrefix="cancel-order" />
            <button type="submit" className={cn(buttonVariants({ variant: "destructive", size: "pillSm" }), "mt-3")}>
              {t("confirmCancelOrder")}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

async function RoundHeader({ round, index, tz }: { round: Round; index: number; tz: string }) {
  const t = await getTranslations("order");
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[17px] font-extrabold">
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
      <RoundChip status={round.status} />
      {round.note && <p className="w-full rounded-lg bg-sun-tint px-3 py-1.5 text-[15px] font-semibold">{t("note", { note: round.note })}</p>}
    </div>
  );
}

type ErrorReader = Awaited<ReturnType<typeof readError>>;

async function ItemList({ order, round, role, error }: { order: Order; round: Round; role: Role; error: ErrorReader }) {
  const cancellable = order.status === "open" && round.status !== "pending_approval" && round.status !== "rejected";
  return (
    <ul className="mt-2 divide-y divide-line">
      {round.items.map((item) => (
        <ItemRow key={item.id} order={order} item={item} role={role} cancellable={cancellable && !item.cancelledAt} error={error} />
      ))}
    </ul>
  );
}

async function ItemRow({
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
  const t = await getTranslations("order");
  const formError = error.forForm(`cancel-${item.id}`);
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("min-w-0", item.cancelledAt && "text-muted-foreground line-through")}>
          <p className="text-[17px] font-bold">
            <span className="tabular-nums">{item.quantity} ×</span> {item.name}
          </p>
          {item.note && <p className="text-[15px] font-semibold text-brand no-underline">{item.note}</p>}
        </div>
        <span className={cn("shrink-0 font-semibold tabular-nums", item.cancelledAt && "text-muted-foreground line-through")}>
          {formatTaka(item.lineTotalTaka)}
        </span>
      </div>
      {item.cancelledAt && (
        <p className="text-[14.5px] font-semibold text-late">{t("cancelled", { reason: item.cancelReason ?? "" })}</p>
      )}
      {cancellable && (
        <details id={`cancel-${item.id}`} open={!!formError} className="mt-1">
          <summary className="inline-flex min-h-12 items-center rounded-lg px-2 text-[15px] font-bold text-late hover:bg-late/5">
            {t("cancelItem")}
          </summary>
          <form action={cancelItem} className="mt-1 rounded-xl bg-gray/60 p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="itemId" value={item.id} />
            {formError && <Notice>{formError}</Notice>}
            <label className="mt-2 block text-[15.5px] font-bold">
              {t("cancelReason")}
              <input name="reason" required maxLength={200} placeholder={t("cancelPlaceholder")} className={fieldClass} />
            </label>
            <OverrideFields role={role} idPrefix={`c-${item.id}`} />
            <button type="submit" className={cn(buttonVariants({ variant: "destructive", size: "pillSm" }), "mt-3")}>
              {t("confirmCancel", { name: item.name })}
            </button>
          </form>
        </details>
      )}
    </li>
  );
}
