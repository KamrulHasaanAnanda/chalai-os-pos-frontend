"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createCouponAction,
  removeCouponAction,
  updateCouponAction,
} from "@/actions/manage";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/app/empty-state";
import type { ManageCoupon } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ManageCouponsView({ coupons }: { coupons: ManageCoupon[] }) {
  const t = useTranslations("manageCoupons");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");

  function refresh() {
    router.refresh();
  }

  function add() {
    setError(null);
    const pct = Number(percent);
    if (!code.trim() || !Number.isFinite(pct) || pct <= 0) {
      setError(t("invalid"));
      return;
    }
    start(async () => {
      const result = await createCouponAction({
        code: code.trim().toUpperCase(),
        kind: "percent",
        percent: pct,
        active: true,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCode("");
      refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <header className="mb-5 border-b border-zinc-200 pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <p className="mt-1 text-[13.5px] text-zinc-500">{t("lead")}</p>
      </header>

      <form
        className="mb-6 border-b border-zinc-200 pb-5"
        onSubmit={(ev) => {
          ev.preventDefault();
          add();
        }}
      >
        <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">
          {t("addTitle")}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={code}
            onChange={(ev) => setCode(ev.target.value.toUpperCase())}
            placeholder={t("codePlaceholder")}
            maxLength={20}
            aria-label={t("codePlaceholder")}
            className="h-10 flex-1 rounded-md border border-zinc-300 bg-white px-3 font-mono text-[14px] uppercase tracking-wide text-zinc-900 outline-none placeholder:normal-case placeholder:tracking-normal focus:border-zinc-500"
          />
          <div className="relative w-full sm:w-24">
            <input
              value={percent}
              onChange={(ev) => setPercent(ev.target.value)}
              inputMode="decimal"
              aria-label="%"
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-7 text-[14px] tabular-nums outline-none focus:border-zinc-500"
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-zinc-400">
              %
            </span>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 text-[13.5px] font-medium text-white disabled:opacity-50"
          >
            <Icon name="plus" className="size-3.5" />
            {t("add")}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>

      {coupons.length === 0 ? (
        <EmptyState
          icon="coupon"
          title={t("empty")}
          body={t("emptyBody")}
          className="border border-dashed border-zinc-300 bg-transparent py-14"
        />
      ) : (
        <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
          {coupons.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[15px] font-semibold tracking-wide text-zinc-900">
                  {c.code}
                </p>
                <p className="mt-0.5 text-[13px] text-zinc-500">
                  {c.kind === "percent"
                    ? t("percentOff", { n: String(c.percent ?? 0) })
                    : t("amountOff", {
                        amount: formatTaka(c.amountTaka ?? 0),
                      })}
                  <span className="text-zinc-300"> · </span>
                  {t("uses", { n: String(c.uses) })}
                </p>
              </div>
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  c.active ? "text-emerald-700" : "text-zinc-400",
                )}
              >
                {c.active ? t("on") : t("off")}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await updateCouponAction(c.id, { active: !c.active });
                    refresh();
                  })
                }
                className="h-8 rounded-md px-2.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
              >
                {c.active ? t("turnOff") : t("turnOn")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await removeCouponAction(c.id);
                    refresh();
                  })
                }
                className="flex size-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label={t("remove")}
              >
                <Icon name="x" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
