import Link from "next/link";
import { useTranslations } from "next-intl";
import { approveRound, rejectRound } from "@/actions/orders";
import { Elapsed } from "@/components/elapsed";
import { Icon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { inputClass, Notice } from "@/components/app/field";
import { SubmitButton } from "@/components/app/submit-button";
import type { Order, User } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime } from "@/lib/format";
import type { Incoming, IncomingRound } from "@/lib/incoming";
import { orderHref } from "@/lib/paths";
import { billRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * Everything guests are waiting on, oldest first: QR orders to approve (right here, without opening the table)
 * and bill requests. Live updates refresh it like the floor.
 */
export function IncomingView({
  incoming,
  user,
  timeZone: tz,
  error,
}: {
  incoming: Incoming;
  user: User;
  timeZone: string;
  error: ErrorReader;
}) {
  const t = useTranslations("incoming");
  const { rounds, bills } = incoming;
  const generalError = error.forForm("rounds") ?? error.general;
  const waiting = rounds.length + bills.length > 0;
  const both = rounds.length > 0 && bills.length > 0;
  const summary = [
    rounds.length > 0 && t("qrTitle", { n: rounds.length }),
    bills.length > 0 && t("billsTitle", { n: bills.length }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[640px]">
      <header className="mb-5 border-b border-zinc-200 pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        {waiting && (
          <p className="mt-1 text-[13.5px] text-zinc-500">{summary}</p>
        )}
      </header>

      {generalError && <Notice className="mb-4">{generalError}</Notice>}

      {!waiting ? (
        <EmptyState
          icon="inbox"
          title={t("emptyTitle")}
          body={t("emptyBody")}
          className="border border-dashed border-zinc-300 bg-transparent py-14"
        />
      ) : (
        <div className="space-y-6">
          {rounds.length > 0 && (
            <section
              aria-labelledby={both ? "qr-title" : undefined}
              className="space-y-3"
            >
              {both && (
                <h2
                  id="qr-title"
                  className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400 uppercase"
                >
                  {t("qrTitle", { n: rounds.length })}
                </h2>
              )}
              <ul className="space-y-3">
                {rounds.map((item) => (
                  <RoundCard
                    key={item.round.id}
                    item={item}
                    tz={tz}
                    error={error}
                  />
                ))}
              </ul>
            </section>
          )}

          {bills.length > 0 && (
            <section
              aria-labelledby={both ? "bills-title" : undefined}
              className="space-y-3"
            >
              {both && (
                <h2
                  id="bills-title"
                  className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400 uppercase"
                >
                  {t("billsTitle", { n: bills.length })}
                </h2>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {bills.map((order) => (
                  <BillCard
                    key={order.id}
                    order={order}
                    tz={tz}
                    canBill={billRoles.includes(user.role)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function where(order: Order, t: ReturnType<typeof useTranslations<"incoming">>) {
  if (order.tableLabel) return t("table", { table: order.tableLabel });
  if (!order.tokenNo) return t("takeaway");
  return order.type === "delivery"
    ? t("delivery", { token: order.tokenNo })
    : t("pickup", { token: order.tokenNo });
}

function RoundCard({
  item: { order, round },
  tz,
  error,
}: {
  item: IncomingRound;
  tz: string;
  error: ErrorReader;
}) {
  const t = useTranslations("incoming");
  const tOrder = useTranslations("order");
  const live = round.items.filter((i) => !i.cancelledAt);
  const total = live.reduce((sum, i) => sum + i.lineTotalTaka, 0);
  const rejectForm = `reject-${round.id}`;
  const rejectError = error.forForm(rejectForm);
  const firstRound = order.rounds[0]?.id === round.id;

  const timed =
    (order.type === "pickup" || order.type === "delivery") && order.pickupAt;
  const delivery = order.type === "delivery" ? order.delivery : null;
  const meta = [
    order.areaName,
    order.guestName,
    order.guestPhone,
    timed
      ? t(order.type === "delivery" ? "deliverAt" : "pickupAt", {
          time: formatTime(order.pickupAt!, tz),
        })
      : firstRound
        ? t("firstOrder")
        : t("moreOrder"),
    t("sentAt", { time: formatTime(round.createdAt, tz) }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-tight font-semibold text-zinc-900 sm:text-[18px]">
            {where(order, t)}
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-zinc-500">
            {meta}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[13px] font-semibold text-zinc-600 tabular-nums">
          <Icon name="clock" className="size-3.5 text-zinc-400" />
          <span className="sr-only">{t("waiting")}</span>
          <Elapsed since={round.createdAt} />
        </span>
      </div>

      {round.note && (
        <p className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-[13px] font-medium text-amber-950 sm:px-5">
          {tOrder("note", { note: round.note })}
        </p>
      )}

      {delivery && (
        <DeliveryBox
          delivery={delivery}
          className="border-b border-zinc-100 px-4 py-2.5 sm:px-5"
        />
      )}

      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {live.map((line) => (
            <tr key={line.id} className="border-b border-zinc-100 last:border-b-0">
              <td className="w-8 py-2.5 pr-2 pl-4 align-top font-semibold text-zinc-500 tabular-nums sm:pl-5">
                {line.quantity}
              </td>
              <td className="py-2.5 pr-3 align-top">
                <span className="block font-medium text-zinc-900">
                  {line.name}
                </span>
                {line.note && (
                  <span className="mt-0.5 block text-[12.5px] text-zinc-500">
                    {line.note}
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-4 text-right align-top font-semibold tabular-nums sm:pr-5">
                {formatTaka(line.lineTotalTaka)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-zinc-300">
            <td
              colSpan={2}
              className="py-3 pl-4 text-[13px] font-medium tracking-wide text-zinc-500 uppercase sm:pl-5"
            >
              {t("roundTotal")}
            </td>
            <td className="py-3 pr-4 text-right text-[17px] font-semibold tabular-nums sm:pr-5">
              {formatTaka(total)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid gap-2 border-t border-zinc-200 bg-zinc-50/60 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form action={approveRound} className="sm:min-w-0 sm:flex-1">
            <input type="hidden" name="back" value="incoming" />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="roundId" value={round.id} />
            <SubmitButton
              variant="success"
              className="h-11 w-full rounded-none font-semibold sm:h-10"
            >
              <Icon name="check" />
              {tOrder("approve")}
            </SubmitButton>
          </form>
          <details className="group" open={!!rejectError} id={rejectForm}>
            <summary
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 w-full cursor-pointer list-none rounded-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:h-10 sm:w-auto [&::-webkit-details-marker]:hidden",
              )}
            >
              <Icon name="x" />
              {tOrder("reject")}
            </summary>
            <form
              action={rejectRound}
              className="mt-2 w-full border border-zinc-200 bg-white p-3 sm:w-80"
            >
              <input type="hidden" name="back" value="incoming" />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="roundId" value={round.id} />
              {rejectError && <Notice>{rejectError}</Notice>}
              <label className="block text-[13px] font-semibold">
                {tOrder("rejectReason")}
                <input
                  name="reason"
                  required
                  maxLength={200}
                  placeholder={tOrder("rejectPlaceholder")}
                  className={cn(inputClass, "mt-1.5 rounded-none")}
                />
              </label>
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: "destructive" }),
                  "mt-2 h-10 w-full rounded-none",
                )}
              >
                {tOrder("confirmReject")}
              </button>
            </form>
          </details>
          <Link
            href={orderHref(order.id)}
            className="inline-flex h-10 items-center justify-center text-[13.5px] font-semibold text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline sm:ml-auto"
          >
            {t("openOrder")}
          </Link>
        </div>
      </div>
    </li>
  );
}

function BillCard({
  order,
  tz,
  canBill,
}: {
  order: Order;
  tz: string;
  canBill: boolean;
}) {
  const t = useTranslations("incoming");
  return (
    <li className="flex flex-col overflow-hidden border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-tight font-semibold text-zinc-900">
            {where(order, t)}
          </h3>
          <p className="mt-1 text-[12.5px] text-zinc-500">
            {[
              order.areaName,
              order.billRequestedAt &&
                t("askedAt", { time: formatTime(order.billRequestedAt, tz) }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-[18px] font-semibold tabular-nums">
          {formatTaka(order.dueTaka)}
        </span>
      </div>
      <div className="mt-auto border-t border-zinc-200 bg-zinc-50/60 px-4 py-3 sm:px-5">
        {canBill ? (
          <Button asChild className="h-10 w-full rounded-none font-semibold">
            <Link href={orderHref(order.id, "bill")}>
              <Icon name="receipt" />
              {t("takePayment")}
            </Link>
          </Button>
        ) : (
          <p className="border border-zinc-200 bg-white px-3 py-2 text-[13.5px] font-medium text-zinc-600">
            {t("tellCashier")}
          </p>
        )}
      </div>
    </li>
  );
}

/** Where the rider goes and how the guest pays, on a delivery's Incoming card. */
function DeliveryBox({
  delivery,
  className,
}: {
  delivery: NonNullable<Order["delivery"]>;
  className?: string;
}) {
  const t = useTranslations("incoming");
  return (
    <div className={cn("text-[13px] text-zinc-700", className)}>
      <p>
        <span className="font-semibold text-zinc-900">{t("deliverTo")}:</span>{" "}
        {delivery.address}
      </p>
      <p className="mt-0.5 font-semibold text-zinc-900">
        {delivery.payMethod === "bkash" ? t("payBkash") : t("payCash")}
      </p>
    </div>
  );
}
