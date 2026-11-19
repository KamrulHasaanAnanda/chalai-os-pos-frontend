"use client";
// The branch's goods at the POS: what's here, what's expired or going off, and what runs out soon.
// The owner (or a manager with the stock grant) can send some to another branch.

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendStockAction } from "@/actions/stock";
import type { StockGood } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const num = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n);

export function StockView({ goods, branches, canSend }: { goods: StockGood[]; branches: { id: string; name: string }[]; canSend: boolean }) {
  const t = useTranslations("stock");
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const qty = (n: number, unit: StockGood["unit"]) => `${num(n)} ${t(`units.${unit}`)}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-bold">{t("title")}</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">{t("lead")}</p>
      {done && (
        <p role="status" className="mt-3 text-[14px] font-medium text-emerald-700">
          {t("sent")}
        </p>
      )}
      {goods.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-card px-5 py-10 text-center text-[15px] text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-5 divide-y overflow-hidden rounded-xl border bg-card">
          {goods.map((g) => (
            <li key={g.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15.5px] font-semibold">{g.name}</span>
                    {g.low && <Tag tone="amber">{t("low")}</Tag>}
                    {g.expiredQuantity > 0 && <Tag tone="red">{t("expired", { qty: qty(g.expiredQuantity, g.unit) })}</Tag>}
                    {g.expiringSoonQuantity > 0 && <Tag tone="amber">{t("soon", { qty: qty(g.expiringSoonQuantity, g.unit) })}</Tag>}
                  </div>
                  {g.daysLeft !== null && g.daysLeft < 7 && (
                    <p className="mt-0.5 text-[13px] font-medium text-amber-800">{t("runsOut", { days: Math.max(0, Math.floor(g.daysLeft)) })}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[16px] font-bold tabular-nums">{qty(g.quantity, g.unit)}</span>
                  {canSend && g.quantity > 0 && sending !== g.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setSending(g.id);
                        setDone(false);
                      }}
                      className="h-10 rounded-lg px-3 text-[14px] font-semibold ring-1 ring-border hover:bg-muted"
                    >
                      {t("send")}
                    </button>
                  )}
                </div>
              </div>
              {sending === g.id && (
                <SendForm
                  good={g}
                  branches={branches}
                  onClose={(sent) => {
                    setSending(null);
                    setDone(sent);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tag({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[12px] font-semibold", tone === "red" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900")}>
      {children}
    </span>
  );
}

function SendForm({ good, branches, onClose }: { good: StockGood; branches: { id: string; name: string }[]; onClose: (sent: boolean) => void }) {
  const t = useTranslations("stock");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [to, setTo] = useState(branches[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount.trim());

  function submit() {
    setError(null);
    start(async () => {
      const result = await sendStockAction(good.id, to, value);
      if (!result.ok) {
        const code = result.error;
        setError(code === "not_enough" || code === "bad_quantity" || code === "forbidden" ? t(`errors.${code}`) : t("errors.failed"));
        return;
      }
      router.refresh();
      onClose(true);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-3 grid gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_8rem_auto_auto] sm:items-end"
    >
      <label className="grid gap-1 text-[13px] font-semibold">
        {t("sendTo")}
        <select value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg bg-background px-3 text-[15px] ring-1 ring-input">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[13px] font-semibold">
        {t("quantity")} ({t(`units.${good.unit}`)})
        <input
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-11 rounded-lg bg-background px-3 text-[15px] tabular-nums ring-1 ring-input"
        />
      </label>
      <button type="submit" disabled={pending || !(value > 0) || !to} className="h-11 rounded-lg bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-50">
        {t("confirm")}
      </button>
      <button type="button" onClick={() => onClose(false)} disabled={pending} className="h-11 rounded-lg px-3 text-[15px] ring-1 ring-border">
        {t("cancel")}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-red-600 sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}
