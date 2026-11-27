"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { applyDiscount, removeCoupon, returnPoints, spendPoints } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { OverrideFields } from "@/components/override-fields";
import { inputClass, Notice } from "@/components/app/field";
import type { Order, User } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BillAdjustmentsBar({
  order,
  user,
  couponBox,
  couponError,
  discountError,
}: {
  order: Order;
  user: User;
  /** The coupon form, rendered on the server (it reads the page's error itself). */
  couponBox: ReactNode;
  couponError?: string;
  discountError?: string;
}) {
  const t = useTranslations("bill");
  const tCoupon = useTranslations("coupon");
  const [panel, setPanel] = useState<"coupon" | "discount" | "loyalty" | null>(
    // A form that came back with an error opens again, so the message is seen.
    couponError ? "coupon" : discountError ? "discount" : null,
  );

  const coupon = order.coupon;
  const hasDiscount = order.discountTaka > 0;
  const loyalty = order.loyalty;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-zinc-50 px-4 py-2.5 sm:px-5">
      <span className="sr-only">{t("adjustments")}</span>
      {coupon ? (
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 text-[12.5px] font-semibold text-emerald-900">
          {coupon.code}
          <form action={removeCoupon} className="inline">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="back" value="bill" />
            <button type="submit" className="rounded px-1 hover:bg-emerald-200" aria-label={tCoupon("remove")}>
              ×
            </button>
          </form>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPanel(panel === "coupon" ? null : "coupon")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold",
            panel === "coupon"
              ? "border-orange-400 bg-orange-50"
              : "border-zinc-200 bg-white hover:bg-zinc-50",
          )}
        >
          <Icon name="coupon" className="size-4" />
          {t("couponBtn")}
        </button>
      )}
      {hasDiscount ? (
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-violet-100 px-2.5 text-[12.5px] font-semibold text-violet-900">
          {t("discountApplied", { amount: formatTaka(order.discountTaka) })}
          <button
            type="button"
            onClick={() => setPanel("discount")}
            className="rounded px-1 hover:bg-violet-200"
            aria-label={t("addDiscount")}
          >
            …
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPanel(panel === "discount" ? null : "discount")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold",
            panel === "discount"
              ? "border-orange-400 bg-orange-50"
              : "border-zinc-200 bg-white hover:bg-zinc-50",
          )}
        >
          <Icon name="percent" className="size-4" />
          {t("discountBtn")}
        </button>
      )}
      {order.customer && (order.loyalty || (order.customer.points ?? 0) > 0) ? (
        <button
          type="button"
          onClick={() => setPanel(panel === "loyalty" ? null : "loyalty")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-semibold hover:bg-zinc-50"
        >
          {t("pointsTitle")}
        </button>
      ) : null}

      {panel === "coupon" && !coupon ? (
        <div className="w-full basis-full pt-1">
          {couponBox}
        </div>
      ) : null}

      {panel === "discount" ? (
        <form action={applyDiscount} className="w-full basis-full space-y-2 rounded-xl border bg-white p-3">
          <input type="hidden" name="orderId" value={order.id} />
          {discountError ? <Notice>{discountError}</Notice> : null}
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <fieldset className="flex rounded-lg bg-zinc-100 p-1">
              {(["amount", "percent"] as const).map((kind) => (
                <label key={kind}>
                  <input type="radio" name="kind" value={kind} defaultChecked={kind === "amount"} className="peer sr-only" />
                  <span className="flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md px-3 text-[16px] font-bold text-zinc-500 peer-checked:bg-select peer-checked:text-white">
                    {kind === "amount" ? "৳" : "%"}
                  </span>
                </label>
              ))}
            </fieldset>
            <input name="value" inputMode="numeric" pattern="[0-9]*" required defaultValue={order.discountTaka || ""} className={cn(inputClass, "font-bold tabular-nums")} aria-label={t("discountValue")} />
          </div>
          <input name="reason" maxLength={200} defaultValue={order.discountReason ?? ""} placeholder={t("discountPlaceholder")} className={inputClass} aria-label={t("discountReason")} />
          <OverrideFields role={user.role} idPrefix="discount" />
          <button type="submit" className="h-11 w-full rounded-lg bg-primary text-[14px] font-semibold text-primary-foreground">
            {t("applyDiscount")}
          </button>
        </form>
      ) : null}

      {panel === "loyalty" && order.customer ? (
        <div className="w-full basis-full rounded-xl border bg-white p-3">
          {loyalty ? (
            <form action={returnPoints} className="flex items-center justify-between gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <p className="text-[13.5px]">{t("pointsUsed", { n: loyalty.spent })}</p>
              <button type="submit" className="h-10 rounded-lg px-3 text-[13.5px] font-semibold ring-1 ring-zinc-300">
                {t("pointsRemove")}
              </button>
            </form>
          ) : (
            <form action={spendPoints}>
              <input type="hidden" name="orderId" value={order.id} />
              <p className="text-[13.5px] text-muted-foreground">
                {t("pointsBalance", { name: order.customer.name, n: order.customer.points ?? 0 })}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  name="points"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  defaultValue={Math.min(order.customer.points ?? 0, Math.floor(order.dueTaka))}
                  className={cn(inputClass, "font-bold tabular-nums")}
                  aria-label={t("pointsAmount")}
                />
                <button type="submit" className="h-11 shrink-0 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground">
                  {t("pointsUse")}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}