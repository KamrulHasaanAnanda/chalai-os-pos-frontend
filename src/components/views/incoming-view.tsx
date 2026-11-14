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

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      <PageHeader title={t("title")} description={t("summary", { orders: rounds.length, bills: bills.length })} />

      {generalError && <Notice>{generalError}</Notice>}

      {rounds.length === 0 && bills.length === 0 ? (
        <EmptyState icon="inbox" title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <>
          {rounds.length > 0 && (
            <section aria-labelledby="qr-title" className="space-y-3">
              <h2 id="qr-title" className="flex items-center gap-2 text-[20px] font-bold">
                <Icon name="bell" className="size-5 text-muted-foreground" />
                {t("qrTitle", { n: rounds.length })}
              </h2>
              <ul className="space-y-3">
                {rounds.map((item) => (
                  <RoundCard key={item.round.id} item={item} tz={tz} error={error} />
                ))}
              </ul>
            </section>
          )}

          {bills.length > 0 && (
            <section aria-labelledby="bills-title" className="space-y-3">
              <h2 id="bills-title" className="flex items-center gap-2 text-[20px] font-bold">
                <Icon name="receipt" className="size-5 text-muted-foreground" />
                {t("billsTitle", { n: bills.length })}
              </h2>
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

  return (
    <li className={cn(cardClass, "border-l-4 border-l-orange-500 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-[20px] leading-tight font-semibold">{where(order, t)}</h3>
          <p className="text-[15px] text-muted-foreground">
            {[order.areaName, order.guestName, order.guestPhone, firstRound ? t("firstOrder") : t("moreOrder")]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[15px] font-semibold tabular-nums border">
          <Icon name="clock" className="size-4" />
          <span className="sr-only">{t("waiting")}</span>
          <Elapsed since={round.createdAt} />
        </span>
      </div>

      {round.note && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-[14px] font-medium text-amber-900">{tOrder("note", { note: round.note })}</p>
      )}

      <ul className="mt-3 divide-y divide-line rounded-md bg-card px-3">
        {live.map((line) => (
          <li key={line.id} className="flex items-baseline gap-3 py-2">
            <span className="w-8 shrink-0 text-[17px] font-semibold tabular-nums">{line.quantity}×</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16.5px] font-semibold">{line.name}</span>
              {line.note && <span className="block text-[14.5px] text-muted-foreground">{line.note}</span>}
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatTaka(line.lineTotalTaka)}</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between py-2 text-[16px] font-semibold">
          <span>{t("roundTotal")}</span>
          <span className="tabular-nums">{formatTaka(total)}</span>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form action={approveRound}>
          <input type="hidden" name="back" value="incoming" />
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="roundId" value={round.id} />
          <SubmitButton variant="success" size="lg">
            <Icon name="check" />
            {tOrder("approve")}
          </SubmitButton>
        </form>
        <details className="group min-w-[240px] flex-1" open={!!rejectError} id={rejectForm}>
          <summary className={cn(buttonVariants({ variant: "destructive", size: "lg" }), "w-fit cursor-pointer list-none")}>
            <Icon name="x" />
            {tOrder("reject")}
          </summary>
          <form action={rejectRound} className="mt-2">
            <input type="hidden" name="back" value="incoming" />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="roundId" value={round.id} />
            {rejectError && <Notice>{rejectError}</Notice>}
            <label className="mt-2 block text-[15.5px] font-semibold">
              {tOrder("rejectReason")}
              <input name="reason" required maxLength={200} placeholder={tOrder("rejectPlaceholder")} className={cn(inputClass, "mt-1.5")} />
            </label>
            <button type="submit" className={cn(buttonVariants({ variant: "destructive" }), "mt-2")}>
              {tOrder("confirmReject")}
            </button>
          </form>
        </details>
        <Link
          href={orderHref(order.id)}
          className="inline-flex min-h-12 items-center gap-1 px-2 text-[15.5px] font-semibold text-maroon hover:underline"
        >
          {t("openOrder")}
        </Link>
      </div>
      <p className="mt-2 text-[13.5px] text-muted-foreground">{t("sentAt", { time: formatTime(round.createdAt, tz) })}</p>
    </li>
  );
}

function BillCard({ order, tz, canBill }: { order: Order; tz: string; canBill: boolean }) {
  const t = useTranslations("incoming");
  return (
    <li className={cn(cardClass, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-[22px] leading-tight font-semibold">{where(order, t)}</h3>
          <p className="text-[15px] text-muted-foreground">
            {[order.areaName, order.billRequestedAt && t("askedAt", { time: formatTime(order.billRequestedAt, tz) })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-[20px] font-semibold tabular-nums">{formatTaka(order.dueTaka)}</span>
      </div>
      {canBill ? (
        <Button asChild variant="default" size="lg">
<Link href={orderHref(order.id, "bill")}>
          <Icon name="receipt" />
          {t("takePayment")}
        </Link>
</Button>
      ) : (
        <p className="rounded-lg bg-gray px-3 py-2 text-[14.5px] font-semibold">{t("tellCashier")}</p>
      )}
    </li>
  );
}
