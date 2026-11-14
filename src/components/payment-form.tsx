"use client";
// Client component: the dark checkout panel. Method tabs, the cash the guest hands over and the change,
// and one button. Customer name/phone live on the bill (inputs with form={PAY_FORM_ID}) and submit with this form.

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "@/actions/orders";
import { Icon } from "@/components/icons";
import type { PaymentMethod } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PAY_FORM_ID = "pay-form";

const methods: { id: PaymentMethod; dot: string }[] = [
  { id: "cash", dot: "bg-emerald-500" },
  { id: "bkash", dot: "bg-bkash" },
  { id: "nagad", dot: "bg-nagad" },
  { id: "card", dot: "bg-blue-500" },
];

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
}: {
  orderId: string;
  dueTaka: number;
  paidTaka: number;
  totalTaka: number;
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
  const paidShare =
    totalTaka > 0 ? Math.min(100, Math.round((paidTaka / totalTaka) * 100)) : 0;

  return (
    <form
      id={PAY_FORM_ID}
      action={recordPayment}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="method" value={method} />
      {!splitting && <input type="hidden" name="amount" value={amount} />}

      {/* What's due, and how much of the bill is already paid. */}
      <div className="shrink-0 px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold tracking-wide text-zinc-400 uppercase">
              {partial ? t("takingNow") : t("due")}
            </p>
            <p className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              {formatTaka(shown)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSplitting((s) => !s);
              setAmount(String(dueTaka));
            }}
            className={cn(
              "mt-1 h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold ring-1 transition-colors",
              splitting
                ? "bg-white text-zinc-900 ring-white"
                : "text-zinc-300 ring-white/20 hover:bg-white/10",
            )}
          >
            {splitting ? t("payInFull") : t("splitBill")}
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${paidShare}%` }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-zinc-400 tabular-nums">
          {t("dueDetail", {
            total: formatTaka(totalTaka),
            paid: formatTaka(paidTaka),
          })}
        </p>

        {splitting && (
          <label className="mt-3 flex h-12 items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/15 focus-within:ring-white/50">
            <span className="text-[13px] font-semibold text-zinc-400">
              {t("amountToTake")}
            </span>
            <span
              aria-hidden
              className="ml-auto text-[18px] font-bold text-zinc-500"
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
      </div>

      {/* Method tabs. */}
      <div
        role="radiogroup"
        aria-label={t("method")}
        className="mx-5 mt-4 grid shrink-0 grid-cols-4 gap-1 rounded-xl bg-white/5 p-1"
      >
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={method === m.id}
            onClick={() => setMethod(m.id)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13.5px] font-semibold transition-colors",
              method === m.id
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <span aria-hidden className={cn("size-2 rounded-full", m.dot)} />
            {tMethod(m.id)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-1">
        {method === "cash" ? (
          <>
            {/* Cash the guest handed over (typed), and the change worked out from it. */}
            <div className="grid grid-cols-2 gap-2">
              <label className="block min-w-0">
                <span className="text-[11.5px] font-bold tracking-wide text-zinc-400 uppercase">
                  {t("tendered")}
                </span>
                <span className="mt-1.5 flex h-16 items-center gap-2 rounded-xl bg-white/5 px-3.5 ring-1 ring-white/15 transition focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-orange-400">
                  <span
                    aria-hidden
                    className="text-[20px] font-bold text-zinc-500"
                  >
                    ৳
                  </span>
                  <input
                    name="tendered"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    autoFocus
                    value={tendered}
                    onChange={(e) =>
                      setTendered(e.target.value.replace(/\D/g, "").slice(0, 7))
                    }
                    placeholder={String(shown)}
                    className="w-full min-w-0 bg-transparent text-[26px] font-bold tabular-nums outline-none placeholder:text-zinc-600"
                  />
                </span>
              </label>
              <label className="block min-w-0">
                <span className="text-[11.5px] font-bold tracking-wide text-zinc-400 uppercase">
                  {change !== null && change < 0 ? t("shortBy") : t("giveBack")}
                </span>
                <span
                  className={cn(
                    "mt-1.5 flex h-16 items-center gap-2 rounded-xl px-3.5 ring-1",
                    change === null
                      ? "bg-white/5 ring-white/10"
                      : change >= 0
                        ? "bg-emerald-500/15 ring-emerald-400/40"
                        : "bg-red-500/15 ring-red-400/40",
                  )}
                >
                  <span
                    aria-hidden
                    className="text-[20px] font-bold text-zinc-500"
                  >
                    ৳
                  </span>
                  <output
                    aria-live="polite"
                    className={cn(
                      "w-full min-w-0 truncate text-[26px] font-bold tabular-nums",
                      change === null
                        ? "text-zinc-600"
                        : change >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                    )}
                  >
                    {change === null
                      ? "0"
                      : new Intl.NumberFormat("en-IN").format(Math.abs(change))}
                  </output>
                </span>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTendered(String(shown))}
                className="h-10 rounded-lg bg-emerald-500/15 text-[13px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/25"
              >
                {t("exact")}
              </button>
              {quickCash(shown).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTendered(String(n))}
                  className={cn(
                    "h-10 rounded-lg text-[13px] font-bold tabular-nums ring-1 transition-colors",
                    tenderedValue === n
                      ? "bg-white text-zinc-900 ring-white"
                      : "bg-white/5 ring-white/10 hover:bg-white/10",
                  )}
                >
                  {formatTaka(n)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <label className="block">
            <span className="text-[11.5px] font-bold tracking-wide text-zinc-400 uppercase">
              {method === "card" ? t("cardReference") : t("walletReference")}
            </span>
            <input
              name="reference"
              maxLength={100}
              autoComplete="off"
              placeholder={method === "card" ? "004512" : "8N7A2KQ9XZ"}
              className="mt-1.5 h-14 w-full rounded-xl bg-white/5 px-4 text-[18px] font-semibold ring-1 ring-white/15 outline-none placeholder:text-zinc-600 focus:ring-white/50"
            />
            <span className="mt-2 block text-[13px] text-zinc-400">
              {method === "card" ? t("cardHint") : t("walletHint")}
            </span>
          </label>
        )}
      </div>

      <div className="shrink-0 p-5 pt-3">
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

/** Wide pay button: what happens on the left, the amount on the right, like a card terminal's confirm key. */
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
      className="group flex h-16 w-full items-center gap-3 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 pr-2 pl-3 text-left text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_24px_-8px_rgb(249_115_22/0.6)] transition hover:from-orange-400 hover:to-orange-500 active:translate-y-px disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20"
      >
        <Icon
          name={pending ? "spinner" : "check"}
          className={cn("size-5", pending && "animate-spin")}
        />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[16px] font-bold">{title}</span>
        <span className="block truncate text-[12.5px] font-medium text-white/80 group-disabled:text-zinc-500">
          {detail}
        </span>
      </span>
      <span className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-black/20 px-4 text-[20px] font-bold tabular-nums">
        {amount}
        <Icon
          name="go"
          className="size-5 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}
