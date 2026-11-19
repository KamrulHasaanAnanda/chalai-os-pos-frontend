"use client";
// Customer credit (বাকি): the cashier finds a customer by phone, sees what they owe and their last entries,
// and takes money back in cash, bKash, Nagad or card. Cash lands in this person's shift as cash in.

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { collectCreditAction, findCreditCustomerAction } from "@/actions/manage";
import { Icon } from "@/components/icons";
import type { CustomerCredit } from "@/lib/api/types";
import { formatDateTime, formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type CollectMethod = "cash" | "bkash" | "nagad" | "card";
const METHODS: CollectMethod[] = ["cash", "bkash", "nagad", "card"];

export function CreditView({ timeZone }: { timeZone: string }) {
  const t = useTranslations("credit");
  const tMethod = useTranslations("paymentMethod");
  const [pending, start] = useTransition();
  const [phone, setPhone] = useState("");
  const [credit, setCredit] = useState<CustomerCredit | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [method, setMethod] = useState<CollectMethod>("cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  // One key per collection attempt, so a double tap or a retry after a timeout records it once.
  const key = useRef(crypto.randomUUID());

  function search() {
    setError(null);
    setNotFound(false);
    setDone(null);
    start(async () => {
      const result = await findCreditCustomerAction(phone.trim());
      if (!result.ok) return setError(result.error.message);
      if (!result.data) {
        setCredit(null);
        setNotFound(true);
        return;
      }
      setCredit(result.data);
      setAmount(result.data.balanceTaka > 0 ? String(result.data.balanceTaka) : "");
    });
  }

  function collect() {
    if (!credit) return;
    const value = Number(amount);
    setError(null);
    if (!Number.isFinite(value) || value <= 0) return setError(t("badAmount"));
    start(async () => {
      const result = await collectCreditAction(
        credit.customer.id,
        { method, amountTaka: value, note: note.trim() || undefined },
        key.current,
      );
      if (!result.ok) return setError(result.error.message);
      key.current = crypto.randomUUID();
      setDone(value);
      setCredit(result.data);
      setAmount(result.data.balanceTaka > 0 ? String(result.data.balanceTaka) : "");
      setNote("");
    });
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <header className="mb-5 border-b border-zinc-200 pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{t("title")}</h1>
        <p className="mt-1 text-[13.5px] text-zinc-500">{t("lead")}</p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          search();
        }}
      >
        <input
          value={phone}
          onChange={(ev) => setPhone(ev.target.value.replace(/[^\d+]/g, "").slice(0, 14))}
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          aria-label={t("phone")}
          className="h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-[16px] tabular-nums outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={pending || phone.trim().length < 11}
          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-[14px] font-medium text-white disabled:opacity-50"
        >
          <Icon name={pending ? "spinner" : "search"} className={cn("size-4", pending && "animate-spin")} />
          {t("find")}
        </button>
      </form>

      {notFound && <p className="mt-4 text-[14px] text-zinc-600">{t("notFound")}</p>}

      {credit && (
        <section className="mt-6">
          <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
            <div className="min-w-0">
              <p className="truncate text-[18px] font-semibold text-zinc-900">{credit.customer.name}</p>
              <p className="text-[13px] text-zinc-500 tabular-nums">{credit.customer.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-zinc-500">{t("owes")}</p>
              <p className={cn("text-[28px] leading-none font-bold tabular-nums", credit.balanceTaka > 0 ? "text-amber-700" : "text-zinc-900")}>
                {formatTaka(credit.balanceTaka)}
              </p>
              {credit.limitTaka !== null && (
                <p className="mt-1 text-[12px] text-zinc-500">{t("limit", { amount: formatTaka(credit.limitTaka) })}</p>
              )}
            </div>
          </div>

          {done !== null && (
            <p role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-[13.5px] text-emerald-800">
              {t("collected", { amount: formatTaka(done) })}
            </p>
          )}

          {credit.balanceTaka > 0 && (
            <form
              className="mt-5 space-y-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                collect();
              }}
            >
              <div role="radiogroup" aria-label={t("method")} className="grid grid-cols-4 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "h-11 rounded-md border text-[14px] font-semibold",
                      method === m ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500",
                    )}
                  >
                    {tMethod(m)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <label className="flex h-11 w-40 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 focus-within:border-zinc-500">
                  <span aria-hidden className="text-zinc-400">৳</span>
                  <input
                    value={amount}
                    onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    aria-label={t("amount")}
                    className="w-full bg-transparent text-[16px] font-semibold tabular-nums outline-none"
                  />
                </label>
                <input
                  value={note}
                  onChange={(ev) => setNote(ev.target.value.slice(0, 120))}
                  placeholder={t("notePlaceholder")}
                  aria-label={t("notePlaceholder")}
                  className="h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-[14px] outline-none focus:border-zinc-500"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-[15px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Icon name={pending ? "spinner" : "check"} className={cn("size-4", pending && "animate-spin")} />
                {t("collect")}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-[13px] text-red-600" role="alert">
              {error}
            </p>
          )}

          <h2 className="mt-7 text-[11px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">{t("history")}</h2>
          {credit.entries.length === 0 ? (
            <p className="mt-2 text-[13.5px] text-zinc-500">{t("noHistory")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
              {credit.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="min-w-0">
                    <span className="font-medium text-zinc-900">
                      {e.kind === "given"
                        ? t("given", { number: e.orderNumber ?? "" })
                        : e.kind === "collected"
                          ? t("paidBack", { method: e.method ? tMethod(e.method) : "" })
                          : t("writtenOff")}
                    </span>
                    <span className="block truncate text-[12px] text-zinc-500">
                      {[formatDateTime(e.at, timeZone), e.staffName, e.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={cn("shrink-0 font-semibold tabular-nums", e.kind === "given" ? "text-amber-700" : "text-emerald-700")}>
                    {e.kind === "given" ? "+" : "−"}
                    {formatTaka(e.amountTaka)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
