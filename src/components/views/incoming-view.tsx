import Link from "next/link";
import { useTranslations } from "next-intl";
import { approveRound, rejectRound } from "@/actions/orders";
import { Elapsed } from "@/components/elapsed";
import { Icon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardClass } from "@/components/app/surface";
import { EmptyState } from "@/components/app/empty-state";
import { inputClass, Notice } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
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
  const summary = [rounds.length > 0 && t("qrTitle", { n: rounds.length }), bills.length > 0 && t("billsTitle", { n: bills.length })]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <PageHeader title={t("title")} description={waiting ? summary : undefined} />

      {generalError && <Notice>{generalError}</Notice>}

      {!waiting ? (
        <EmptyState icon="inbox" title={t("emptyTitle")} body={t("emptyBody")} className="rounded-xl border bg-card py-16" />
      ) : (
        <>
          {rounds.length > 0 && (
            <section aria-labelledby={both ? "qr-title" : undefined} className="space-y-3">
              {both && (
                <h2 id="qr-title" className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("qrTitle", { n: rounds.length })}
                </h2>
              )}
              <ul className="space-y-3">
                {rounds.map((item) => (
                  <RoundCard key={item.round.id} item={item} tz={tz} error={error} />
                ))}
              </ul>
            </section>
          )}

          {bills.length > 0 && (
            <section aria-labelledby={both ? "bills-title" : undefined} className="space-y-3">
              {both && (
                <h2 id="bills-title" className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("billsTitle", { n: bills.length })}
                </h2>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {bills.map((order) => (
                  <BillCard key={order.id} order={order} tz={tz} canBill={billRoles.includes(user.role)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function where(order: Order, t: ReturnType<typeof useTranslations<"incoming">>) {
  return order.tableLabel ? t("table", { table: order.tableLabel }) : t("takeaway");
}

function RoundCard({ item: { order, round }, tz, error }: { item: IncomingRound; tz: string; error: ErrorReader }) {
  const t = useTranslations("incoming");
  const tOrder = useTranslations("order");
  const live = round.items.filter((i) => !i.cancelledAt);
  const total = live.reduce((sum, i) => sum + i.lineTotalTaka, 0);
  const rejectForm = `reject-${round.id}`;
  const rejectError = error.forForm(rejectForm);
  const firstRound = order.rounds[0]?.id === round.id;

  const meta = [order.areaName, order.guestName, order.guestPhone, firstRound ? t("firstOrder") : t("moreOrder"), t("sentAt", { time: formatTime(round.createdAt, tz) })]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={cn(cardClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="font-heading text-[22px] leading-tight font-semibold tracking-tight">{where(order, t)}</h3>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{meta}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] font-semibold text-amber-900 tabular-nums ring-1 ring-amber-200">
          <Icon name="clock" className="size-3.5" />
          <span className="sr-only">{t("waiting")}</span>
          <Elapsed since={round.createdAt} />
        </span>
      </div>

      {round.note && (
        <p className="mx-5 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13.5px] font-medium text-amber-900">{tOrder("note", { note: round.note })}</p>
      )}

      <ul className="mt-4 px-5">
        {live.map((line) => (
          <li key={line.id} className="flex items-baseline gap-3 border-t border-zinc-100 py-2.5 first:border-t-0">
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1.5 text-[12.5px] font-bold tabular-nums">
              {line.quantity}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{line.name}</span>
              {line.note && <span className="block text-[13px] text-muted-foreground">{line.note}</span>}
            </span>
            <span className="shrink-0 text-[14.5px] font-semibold tabular-nums">{formatTaka(line.lineTotalTaka)}</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between border-t border-zinc-200 py-3">
          <span className="text-[13.5px] font-medium text-muted-foreground">{t("roundTotal")}</span>
          <span className="text-[18px] font-semibold tabular-nums">{formatTaka(total)}</span>
        </li>
      </ul>

      <div className="flex flex-wrap items-start gap-2 border-t bg-zinc-50/80 px-5 py-3">
        <form action={approveRound}>
          <input type="hidden" name="back" value="incoming" />
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="roundId" value={round.id} />
          <SubmitButton variant="success">
            <Icon name="check" />
            {tOrder("approve")}
          </SubmitButton>
        </form>
        <details className="group" open={!!rejectError} id={rejectForm}>
          <summary className={cn(buttonVariants({ variant: "destructive" }), "w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
            <Icon name="x" />
            {tOrder("reject")}
          </summary>
          <form action={rejectRound} className="mt-3 w-80 max-w-full">
            <input type="hidden" name="back" value="incoming" />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="roundId" value={round.id} />
            {rejectError && <Notice>{rejectError}</Notice>}
            <label className="block text-[14px] font-semibold">
              {tOrder("rejectReason")}
              <input name="reason" required maxLength={200} placeholder={tOrder("rejectPlaceholder")} className={cn(inputClass, "mt-1.5")} />
            </label>
            <button type="submit" className={cn(buttonVariants({ variant: "destructive" }), "mt-2")}>
              {tOrder("confirmReject")}
            </button>
          </form>
        </details>
        <Link href={orderHref(order.id)} className="ml-auto inline-flex h-12 items-center px-2 text-[14px] font-semibold text-zinc-500 hover:text-zinc-900">
          {t("openOrder")}
        </Link>
      </div>
    </li>
  );
}

function BillCard({ order, tz, canBill }: { order: Order; tz: string; canBill: boolean }) {
  const t = useTranslations("incoming");
  return (
    <li className={cn(cardClass, "flex flex-col overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="font-heading text-[22px] leading-tight font-semibold tracking-tight">{where(order, t)}</h3>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {[order.areaName, order.billRequestedAt && t("askedAt", { time: formatTime(order.billRequestedAt, tz) })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-[20px] font-semibold tabular-nums">{formatTaka(order.dueTaka)}</span>
      </div>
      <div className="border-t bg-zinc-50/80 px-5 py-3">
        {canBill ? (
          <Button asChild className="w-full">
            <Link href={orderHref(order.id, "bill")}>
              <Icon name="receipt" />
              {t("takePayment")}
            </Link>
          </Button>
        ) : (
          <p className="rounded-lg bg-white px-3 py-2 text-[14px] font-medium text-zinc-600 ring-1 ring-zinc-200">{t("tellCashier")}</p>
        )}
      </div>
    </li>
  );
}
