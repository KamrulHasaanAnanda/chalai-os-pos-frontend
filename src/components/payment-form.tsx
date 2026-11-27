"use client";

import { useTranslations } from "next-intl";
import { type MouseEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "@/actions/orders";
import { PaymentMethodMark } from "@/components/bill/payment-method-tile";
import { Icon } from "@/components/icons";
import type { PaymentMethod } from "@/lib/api/types";
import { quickCashChips } from "@/lib/bill-display";
import { openDrawerForCash } from "@/lib/drawer";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PAY_FORM_ID = "pay-form";

const METHODS: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];
const KEY_METHOD: Record<string, PaymentMethod> = {
  F1: "cash",
  F2: "bkash",
  F3: "nagad",
  F4: "card",
};

const toInt = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;

export function PaymentForm({
  orderId,
  dueTaka,
  paidTaka,
  totalTaka: _totalTaka,
  credit = null,
}: {
  orderId: string;
  dueTaka: number;
  paidTaka: number;
  totalTaka: number;
  credit?: { customerName: string | null } | null;
}) {
  const t = useTranslations("bill");
  const tMethod = useTranslations("paymentMethod");
  const formRef = useRef<HTMLFormElement>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(String(dueTaka));
  const [splitting, setSplitting] = useState(false);
  const [tendered, setTendered] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [allowPartial, setAllowPartial] = useState(false);
  const tenderedId = useId();

  const amountValue = toInt(amount);
  const payNow = Number.isNaN(amountValue) ? 0 : amountValue;
  const tenderedValue = toInt(tendered);
  const change =
    method === "cash" && !Number.isNaN(amountValue) && !Number.isNaN(tenderedValue)
      ? tenderedValue - amountValue
      : null;
  const partial = !Number.isNaN(amountValue) && amountValue < dueTaka;
  const short = change !== null && change < 0 ? Math.abs(change) : null;
  const remaining = dueTaka - payNow;

  const chips = quickCashChips(payNow);
  const keys: PaymentMethod[] = credit ? [...METHODS, "credit"] : METHODS;

  const press = useCallback(
    (key: string) =>
      setTendered((v) =>
        key === "back"
          ? v.slice(0, -1)
          : key === "clear"
            ? ""
            : (v + key).replace(/^0+(?=\d)/, "").slice(0, 8),
      ),
    [],
  );

  const validCash =
    method !== "cash" || (tendered.length > 0 && change !== null && change >= 0);
  const validAmount = payNow >= 1 && payNow <= dueTaka;
  const canPay = validAmount && (method !== "cash" || validCash);

  // A new amount due (an item added or paid elsewhere) resets what to collect now. Adjusted during render, not in an effect.
  const [dueSeen, setDueSeen] = useState(dueTaka);
  if (dueSeen !== dueTaka) {
    setDueSeen(dueTaka);
    setAmount(String(dueTaka));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== "tel") return;
      if (KEY_METHOD[e.key]) {
        e.preventDefault();
        setMethod(KEY_METHOD[e.key]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTendered("");
        return;
      }
      if (method !== "cash") return;
      if (e.key === "Enter" && canPay && formRef.current) {
        e.preventDefault();
        formRef.current.requestSubmit();
        return;
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPay, method, press]);

  const trySubmit = (e: MouseEvent<HTMLButtonElement>) => {
    if (!canPay) {
      e.preventDefault();
      return;
    }
    if ((partial || splitting) && !allowPartial) {
      e.preventDefault();
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setAllowPartial(false);
  };

  return (
    <form
      ref={formRef}
      id={PAY_FORM_ID}
      action={recordPayment}
      onSubmit={() => {
        if (method === "cash") openDrawerForCash();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="method" value={method} />
      {!splitting ? <input type="hidden" name="amount" value={payNow || dueTaka} /> : null}

      <div className="shrink-0 border-b px-4 py-4 sm:px-5">
        <p className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("due")}
        </p>
        <p className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">
          {formatTaka(dueTaka)}
        </p>
        {paidTaka > 0 ? (
          <p className="mt-1 text-[14px] font-medium text-muted-foreground tabular-nums">
            {t("paidSoFarShort", { amount: formatTaka(paidTaka) })}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label={t("method")}
            className="flex min-w-0 flex-1 flex-wrap gap-2"
          >
            {keys.map((m, i) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                title={`${tMethod(m)} (F${i + 1})`}
                onClick={() => setMethod(m)}
                className={cn(
                  "flex h-[52px] min-w-[4.5rem] flex-1 items-center justify-center rounded-xl border-2 px-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/30",
                  method === m
                    ? "border-select bg-select/10 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300",
                )}
              >
                <PaymentMethodMark method={m} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSplitting((v) => !v);
              setAmount(String(dueTaka));
              setConfirming(false);
            }}
            className={cn(
              "inline-flex h-11 shrink-0 items-center rounded-lg border px-3 text-[13px] font-semibold",
              splitting ? "border-select bg-select/10" : "border-zinc-200 bg-white",
            )}
          >
            {splitting ? t("payInFull") : t("splitBill")}
          </button>
        </div>

        {splitting ? (
          <div className="mt-3 space-y-1">
            <label className="flex h-12 items-center gap-2 rounded-lg border border-input bg-white px-3">
              <span className="text-[13.5px] font-medium text-muted-foreground">{t("amountToTake")}</span>
              <input
                name="amount"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="ml-auto w-28 bg-transparent text-right text-[20px] font-bold tabular-nums outline-none"
                aria-label={t("amountToTake")}
              />
            </label>
            <p className="text-[13px] font-medium text-muted-foreground tabular-nums">
              {t("remainingDue", { amount: formatTaka(Math.max(0, remaining)) })}
            </p>
          </div>
        ) : null}

        {method === "cash" ? (
          <>
            <label htmlFor={tenderedId} className="mt-3 block rounded-xl border border-input bg-white px-3 py-2 focus-within:border-select">
              <span className="text-[12.5px] font-medium text-muted-foreground">{t("tendered")}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] font-bold text-zinc-400">৳</span>
                <input
                  id={tenderedId}
                  name="tendered"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="w-full min-w-0 bg-transparent text-[32px] leading-tight font-bold tabular-nums outline-none"
                  aria-label={t("tendered")}
                />
              </div>
            </label>

            <div
              className={cn(
                "mt-2 rounded-xl border px-3 py-2",
                short
                  ? "border-red-300 bg-red-50"
                  : change !== null && change > 0
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-zinc-200 bg-zinc-50",
              )}
            >
              <span className="text-[12.5px] font-medium text-muted-foreground">
                {short ? t("shortBy") : t("giveBack")}
              </span>
              <output
                aria-live="polite"
                className={cn(
                  "block text-[32px] leading-tight font-bold tabular-nums",
                  short ? "text-red-700" : change && change > 0 ? "text-emerald-700" : "text-zinc-300",
                )}
              >
                {short ? formatTaka(short) : change !== null && change > 0 ? formatTaka(change) : "৳0"}
              </output>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "back"].map((key, i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? t("keyBack") : undefined}
                  style={{ gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 1 }}
                  className="flex h-11 items-center justify-center rounded-lg border border-border bg-white text-[19px] font-semibold tabular-nums shadow-[0_1px_0_rgb(0_0_0/0.06)] hover:bg-zinc-50 active:bg-zinc-100"
                >
                  {key === "back" ? <Icon name="back" className="size-5" /> : key}
                </button>
              ))}
              {chips.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTendered(String(n))}
                  style={{ gridColumn: 4, gridRow: i + 1 }}
                  className={cn(
                    "h-11 rounded-lg border text-[13px] font-bold tabular-nums",
                    n === payNow
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : tenderedValue === n
                        ? "border-select bg-select text-white"
                        : "border-border bg-white hover:bg-zinc-50",
                  )}
                >
                  {n === payNow ? t("exact") : formatTaka(n)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => press("clear")}
                style={{ gridColumn: 4, gridRow: chips.length + 1 }}
                className="h-11 rounded-lg border border-border bg-white text-[14px] font-bold text-red-700 hover:bg-red-50"
              >
                {t("keyClear")}
              </button>
            </div>
          </>
        ) : method === "credit" ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-medium text-amber-900">{t("creditTo")}</p>
            <p className="mt-0.5 text-[18px] font-bold">{credit?.customerName ?? t("creditNoCustomer")}</p>
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
              className="mt-1.5 h-14 w-full rounded-lg border border-input bg-white px-4 text-[18px] font-semibold outline-none focus:border-select focus:ring-3 focus:ring-select/15"
            />
          </label>
        )}

        {confirming ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3" role="alert">
            <p className="text-[14px] font-semibold text-amber-950">{t("partialConfirm")}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-10 flex-1 rounded-lg border bg-white text-[13px] font-semibold"
              >
                {t("partialCancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllowPartial(true);
                  setConfirming(false);
                  formRef.current?.requestSubmit();
                }}
                className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground"
              >
                {t("partialContinue")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t bg-zinc-50 p-3 sm:p-4">
        <Submit
          title={
            short
              ? t("takePartial")
              : t("takePaymentMethod", { method: tMethod(method), amount: formatTaka(payNow) })
          }
          blocked={!canPay}
          onClick={trySubmit}
        />
      </div>
    </form>
  );
}

function Submit({
  title,
  blocked,
  onClick,
}: {
  title: string;
  blocked: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || blocked}
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[16px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-500/40"
    >
      <Icon name={pending ? "spinner" : "check"} className={cn("size-5", pending && "animate-spin")} aria-hidden />
      {title}
    </button>
  );
}