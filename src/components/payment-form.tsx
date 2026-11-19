"use client";
// Client component: a classic till. A totals display, big method keys, a number pad for the cash handed over,
// the change, and one Pay key. Customer name/phone live on the bill (inputs with form={PAY_FORM_ID}) and submit with this form.

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "@/actions/orders";
import { Icon } from "@/components/icons";
import type { PaymentMethod } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PAY_FORM_ID = "pay-form";

const methods: {
  id: PaymentMethod;
  dot: string;
  icon: "cash" | "phone" | "card" | "book";
}[] = [
  { id: "cash", dot: "bg-emerald-500", icon: "cash" },
  { id: "bkash", dot: "bg-bkash", icon: "phone" },
  { id: "nagad", dot: "bg-nagad", icon: "phone" },
  { id: "card", dot: "bg-blue-500", icon: "card" },
];
const creditMethod = { id: "credit" as const, dot: "bg-amber-500", icon: "book" as const };

const toInt = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;

/** Notes a guest is likely to hand over: the next round 100, 500 and 1,000 above the amount. */
function quickCash(amount: number): number[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const up = (step: number) => Math.ceil(amount / step) * step;
  return [...new Set([up(100), up(500), up(1000)])]
    .filter((n) => n > amount)
    .slice(0, 3);
}

export function PaymentForm({
  orderId,
  dueTaka,
  paidTaka,
  totalTaka,
  credit = null,
}: {
  orderId: string;
  dueTaka: number;
  paidTaka: number;
  totalTaka: number;
  /** Shown when credit is on and this person may give it. The customer comes from the bill. */
  credit?: { customerName: string | null } | null;
}) {
  const t = useTranslations("bill");
  const tMethod = useTranslations("paymentMethod");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(String(dueTaka));
  const [splitting, setSplitting] = useState(false);
  const [tendered, setTendered] = useState("");

  const amountValue = toInt(amount);
  const shown = Number.isNaN(amountValue) ? 0 : amountValue;
  const tenderedValue = toInt(tendered);
  const change =
    !Number.isNaN(amountValue) && !Number.isNaN(tenderedValue)
      ? tenderedValue - amountValue
      : null;
  const partial = !Number.isNaN(amountValue) && amountValue < dueTaka;

  /** A number-pad key: digits append, "00" adds two zeros, back deletes one, clear empties. */
  const press = (key: string) =>
    setTendered((v) =>
      key === "back"
        ? v.slice(0, -1)
        : key === "clear"
          ? ""
          : (v + key).replace(/^0+(?=\d)/, "").slice(0, 7),
    );
  const quick = quickCash(shown);
  const keys = credit ? [...methods, creditMethod] : methods;

  return (
    <form
      id={PAY_FORM_ID}
      action={recordPayment}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="method" value={method} />
      {!splitting && <input type="hidden" name="amount" value={amount} />}

      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {/* The till display: total, paid, and the amount due in large type. */}
        <div className="rounded-xl border border-input bg-zinc-50">
          <dl className="space-y-0.5 px-4 pt-3 text-[13.5px] tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("total")}</dt>
              <dd className="font-medium">{formatTaka(totalTaka)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("paid")}</dt>
              <dd className="font-medium">{formatTaka(paidTaka)}</dd>
            </div>
          </dl>
          <div className="mt-2 flex items-end justify-between gap-3 border-t border-dashed border-input px-4 pt-2 pb-3">
            <span className="pb-1 text-[13px] font-semibold tracking-wide uppercase">
              {partial ? t("takingNow") : t("due")}
            </span>
            <span className="text-[36px] leading-none font-bold tracking-tight tabular-nums">
              {formatTaka(shown)}
            </span>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setSplitting((v) => !v);
              setAmount(String(dueTaka));
            }}
            className="text-[13px] font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            {splitting ? t("payInFull") : t("splitBill")}
          </button>
        </div>
        {splitting && (
          <label className="mt-1 flex h-12 items-center gap-2 rounded-lg border border-input bg-white px-3 focus-within:border-select">
            <span className="text-[13.5px] font-medium text-muted-foreground">
              {t("amountToTake")}
            </span>
            <span
              aria-hidden
              className="ml-auto text-[18px] font-bold text-zinc-400"
            >
              ৳
            </span>
            <input
              name="amount"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="w-28 bg-transparent text-right text-[20px] font-bold tabular-nums outline-none"
            />
          </label>
        )}

        {/* Method keys. */}
        <div
          role="radiogroup"
          aria-label={t("method")}
          className={cn(
            "mt-2 grid gap-2",
            credit ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          {keys.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={method === m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-[13.5px] font-semibold transition-colors",
                method === m.id
                  ? "border-select bg-select text-white"
                  : "border-border bg-white text-zinc-700 hover:border-zinc-400",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", m.dot)}
                />
                <Icon name={m.icon} aria-hidden className="size-4" />
              </span>
              {tMethod(m.id)}
            </button>
          ))}
        </div>

        {method === "cash" ? (
          <>
            {/* Received and change, then the number pad with quick notes down the right. */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block min-w-0 rounded-lg border border-input bg-white px-3 py-2 focus-within:border-select">
                <span className="block text-[12.5px] font-medium text-muted-foreground">
                  {t("tendered")}
                </span>
                <span className="flex items-baseline gap-1">
                  <span
                    aria-hidden
                    className="text-[18px] font-bold text-zinc-400"
                  >
                    ৳
                  </span>
                  <input
                    name="tendered"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={tendered}
                    onChange={(e) =>
                      setTendered(e.target.value.replace(/\D/g, "").slice(0, 7))
                    }
                    placeholder={String(shown)}
                    className="w-full min-w-0 bg-transparent text-[26px] leading-tight font-bold tabular-nums outline-none placeholder:text-zinc-300"
                  />
                </span>
              </label>
              <div
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-2",
                  change === null
                    ? "border-border bg-zinc-50"
                    : change >= 0
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-red-300 bg-red-50",
                )}
              >
                <span className="block text-[12.5px] font-medium text-muted-foreground">
                  {change !== null && change < 0 ? t("shortBy") : t("giveBack")}
                </span>
                <output
                  aria-live="polite"
                  className={cn(
                    "block truncate text-[26px] leading-tight font-bold tabular-nums",
                    change === null
                      ? "text-zinc-300"
                      : change >= 0
                        ? "text-emerald-700"
                        : "text-red-700",
                  )}
                >
                  ৳
                  {change === null
                    ? "0"
                    : new Intl.NumberFormat("en-IN").format(Math.abs(change))}
                </output>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                "7",
                "8",
                "9",
                "4",
                "5",
                "6",
                "1",
                "2",
                "3",
                "00",
                "0",
                "back",
              ].map((key, i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? t("keyBack") : undefined}
                  style={{
                    gridColumn: (i % 3) + 1,
                    gridRow: Math.floor(i / 3) + 1,
                  }}
                  className="flex h-11 items-center justify-center rounded-lg border border-border bg-white text-[19px] font-semibold tabular-nums shadow-[0_1px_0_rgb(0_0_0/0.06)] transition-colors hover:bg-zinc-50 active:bg-zinc-100"
                >
                  {key === "back" ? (
                    <Icon name="back" className="size-5" />
                  ) : (
                    key
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTendered(String(shown))}
                style={{ gridColumn: 4, gridRow: 1 }}
                className="h-11 rounded-lg border border-emerald-300 bg-emerald-50 text-[14px] font-bold text-emerald-800 hover:bg-emerald-100"
              >
                {t("exact")}
              </button>
              {quick.slice(0, 2).map((n, i) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTendered(String(n))}
                  style={{ gridColumn: 4, gridRow: i + 2 }}
                  className={cn(
                    "h-11 rounded-lg border text-[14px] font-bold tabular-nums transition-colors",
                    tenderedValue === n
                      ? "border-select bg-select text-white"
                      : "border-border bg-white hover:bg-zinc-50",
                  )}
                >
                  {formatTaka(n)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => press("clear")}
                style={{ gridColumn: 4, gridRow: 4 }}
                className="h-11 rounded-lg border border-border bg-white text-[14px] font-bold text-red-700 hover:bg-red-50"
              >
                {t("keyClear")}
              </button>
            </div>
          </>
        ) : method === "credit" ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-900">
              {t("creditTo")}
            </p>
            <p className="mt-0.5 text-[18px] font-bold text-zinc-900">
              {credit?.customerName ?? t("creditNoCustomer")}
            </p>
            <p className="mt-1.5 text-[13px] text-amber-900">
              {t("creditHint")}
            </p>
          </div>
        ) : (
          <label className="mt-3 block">
            <span className="text-[13px] font-medium text-muted-foreground">
              {method === "card" ? t("cardReference") : t("walletReference")}
            </span>
            <input
              name="reference"
              maxLength={100}
              autoComplete="off"
              placeholder={method === "card" ? "004512" : "8N7A2KQ9XZ"}
              className="mt-1.5 h-14 w-full rounded-lg border border-input bg-white px-4 text-[18px] font-semibold outline-none placeholder:text-zinc-300 focus:border-select"
            />
            <span className="mt-2 block text-[13px] text-muted-foreground">
              {method === "card" ? t("cardHint") : t("walletHint")}
            </span>
          </label>
        )}
      </div>

      <div className="shrink-0 border-t bg-zinc-50 p-3">
        <Submit
          title={t("takePayment")}
          detail={[
            tMethod(method),
            method === "cash" && change !== null && change > 0
              ? t("changeDue", { amount: formatTaka(change) })
              : null,
            partial ? t("partPayment") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          amount={formatTaka(shown)}
          blocked={method === "cash" && change !== null && change < 0}
        />
      </div>
    </form>
  );
}

/** The Pay key: what happens on the left, the amount on the right. */
function Submit({
  title,
  detail,
  amount,
  blocked,
}: {
  title: string;
  detail: string;
  amount: string;
  blocked: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || blocked}
      className="flex h-14 w-full items-center gap-3 rounded-lg bg-emerald-600 px-4 text-left text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
    >
      <Icon
        name={pending ? "spinner" : "check"}
        aria-hidden
        className={cn("size-5 shrink-0", pending && "animate-spin")}
      />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[16px] font-bold">{title}</span>
        <span className="block truncate text-[12.5px] font-medium opacity-85">
          {detail}
        </span>
      </span>
      <span className="shrink-0 text-[22px] font-bold tabular-nums">
        {amount}
      </span>
    </button>
  );
}
