import { useTranslations } from "next-intl";
import { applyCoupon, removeCoupon } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/app/submit-button";
import type { Order } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The coupon on an open bill: a code field with Apply, or the applied coupon with what it takes off and a remove
 * button. Plain form posts (server actions), so it works without JavaScript. `back`: which page to return to.
 */
export function CouponBox({
  order,
  error,
  back,
  className,
}: {
  order: Order;
  error: ErrorReader;
  back?: "bill";
  className?: string;
}) {
  const t = useTranslations("coupon");
  const coupon = order.coupon ?? null;
  const message = error.forForm("coupon");

  if (coupon) {
    const terms =
      coupon.kind === "percent"
        ? t("percent", { percent: coupon.percent ?? 0 })
        : t("flat", { amount: formatTaka(coupon.amountTaka ?? 0) });
    return (
      <div className={className}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border border-dashed px-3 py-2",
            coupon.shortTaka > 0
              ? "border-amber-300 bg-amber-50"
              : "border-emerald-300 bg-emerald-50",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              coupon.shortTaka > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700",
            )}
          >
            <Icon name="coupon" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[14px] font-bold tracking-wide">
              {coupon.code}
              <span className="text-[12.5px] font-medium tracking-normal text-muted-foreground">
                {terms}
              </span>
            </p>
            <p
              className={cn(
                "text-[12.5px] font-semibold",
                coupon.shortTaka > 0 ? "text-amber-800" : "text-emerald-700",
              )}
            >
              {coupon.shortTaka > 0
                ? t("short", { amount: formatTaka(coupon.shortTaka) })
                : t("off", { amount: formatTaka(coupon.discountTaka) })}
            </p>
          </div>
          <form action={removeCoupon}>
            <input type="hidden" name="orderId" value={order.id} />
            {back && <input type="hidden" name="back" value={back} />}
            <button
              type="submit"
              aria-label={t("remove")}
              title={t("remove")}
              className="flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-white hover:text-red-600"
            >
              <Icon name="x" className="size-4" />
            </button>
          </form>
        </div>
        {message && (
          <p className="mt-1.5 text-[12.5px] font-medium text-red-700">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={applyCoupon} className={className}>
      <input type="hidden" name="orderId" value={order.id} />
      {back && <input type="hidden" name="back" value={back} />}
      <label htmlFor={`coupon-${order.id}`} className="sr-only">
        {t("placeholder")}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="coupon"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            id={`coupon-${order.id}`}
            name="code"
            required
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t("placeholder")}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `coupon-${order.id}-error` : undefined}
            className="h-10 w-full rounded-lg border border-input bg-white pr-3 pl-9 text-[14px] font-semibold tracking-wide uppercase shadow-xs outline-none placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-zinc-400 focus-visible:border-orange-400 focus-visible:ring-3 focus-visible:ring-orange-400/25 aria-invalid:border-red-400"
          />
        </div>
        <SubmitButton
          variant="outline"
          size="sm"
          className="h-10 rounded-lg px-4 text-[13.5px] font-semibold"
        >
          {t("apply")}
        </SubmitButton>
      </div>
      {message && (
        <p
          id={`coupon-${order.id}-error`}
          className="mt-1.5 text-[12.5px] font-medium text-red-700"
        >
          {message}
        </p>
      )}
    </form>
  );
}
