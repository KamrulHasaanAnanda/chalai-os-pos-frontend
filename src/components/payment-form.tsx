"use client";
// Client component: shows the fields for the chosen method and the cash change as the cashier types.

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "@/actions/orders";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
import type { PaymentMethod } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

const methods: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];
const methodTone: Record<PaymentMethod, string> = {
  cash: "peer-checked:bg-ok peer-checked:text-white peer-checked:border-ok",
  bkash: "peer-checked:bg-bkash peer-checked:text-white peer-checked:border-bkash",
  nagad: "peer-checked:bg-nagad peer-checked:text-white peer-checked:border-nagad",
  card: "peer-checked:bg-ink peer-checked:text-white peer-checked:border-ink",
};

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

export function PaymentForm({ orderId, dueTaka }: { orderId: string; dueTaka: number }) {
  const t = useTranslations("bill");
  const tMethod = useTranslations("paymentMethod");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(String(dueTaka));
  const [tendered, setTendered] = useState("");

  const amountValue = toInt(amount);
  const tenderedValue = toInt(tendered);
  const change = !Number.isNaN(amountValue) && !Number.isNaN(tenderedValue) ? tenderedValue - amountValue : null;

  return (
    <form action={recordPayment} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset>
        <legend className="text-[15.5px] font-bold">{t("method")}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {methods.map((m) => (
            <label key={m} className="relative">
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex min-h-[56px] cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-white text-[17px] font-extrabold peer-focus-visible:ring-3 peer-focus-visible:ring-maroon/40",
                  methodTone[m],
                )}
              >
                {tMethod(m)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[15.5px] font-bold">
          {t("amount")}
          <input
            name="amount"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(inputClass, "mt-1.5 h-14 text-[22px] font-extrabold tabular-nums")}
          />
          <span className="mt-1 block text-[14px] font-normal text-muted-foreground">{t("amountHint", { due: formatTaka(dueTaka) })}</span>
        </label>
        {method === "cash" ? (
          <label className="block text-[15.5px] font-bold">
            {t("tendered")}
            <input
              name="tendered"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder={amount}
              className={cn(inputClass, "mt-1.5 h-14 text-[22px] font-extrabold tabular-nums")}
            />
          </label>
        ) : (
          <label className="block text-[15.5px] font-bold">
            {method === "card" ? t("cardReference") : t("walletReference")}
            <input name="reference" maxLength={100} autoComplete="off" className={cn(inputClass, "mt-1.5 h-14")} />
          </label>
        )}
      </div>

      {method === "cash" && change !== null && (
        <p
          role="status"
          className={cn(
            "rounded-xl px-4 py-3 text-[20px] font-extrabold tabular-nums",
            change >= 0 ? "bg-ok-soft text-ok" : "bg-late/10 text-late",
          )}
        >
          {change >= 0 ? t("change", { amount: formatTaka(change) }) : t("short", { amount: formatTaka(-change) })}
        </p>
      )}

      <Submit label={t("record", { amount: Number.isNaN(amountValue) ? "" : formatTaka(amountValue) })} />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ variant: "accent", size: "xl", block: true })}>
      {label}
    </button>
  );
}
