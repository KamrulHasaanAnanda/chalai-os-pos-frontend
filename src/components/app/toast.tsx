"use client";
// Client component: shows the success message carried by ?ok=<code> after a server action redirect,
// announces it via aria-live, auto-dismisses and removes the param so a reload doesn't repeat it.

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

export function Toast() {
  const t = useTranslations("toast");
  const params = useSearchParams();
  const code = params.get("ok");
  const at = params.get("at");
  const [hidden, setHidden] = useState<string | null>(null);
  const key = code ? `${code}:${at}` : null;

  useEffect(() => {
    if (!key) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    window.history.replaceState(window.history.state, "", url);
    const id = setTimeout(() => setHidden(key), 4000);
    return () => clearTimeout(id);
  }, [key]);

  const message =
    code && t.has(code as "saved")
      ? t(code as "saved", {
          number: params.get("n") ?? "",
          table: params.get("table") ?? "",
        })
      : code
        ? t("saved")
        : null;
  const visible = !!message && hidden !== key;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6 md:justify-end print:hidden"
    >
      {visible && (
        <div
          key={key}
          className="toast-in pointer-events-auto relative flex w-full max-w-[420px] items-center gap-3 overflow-hidden rounded-xl bg-zinc-900 py-3 pr-2 pl-3.5 text-[14px] font-medium text-white shadow-[0_16px_40px_-12px_rgb(0_0_0/0.5)] ring-1 ring-white/10"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 leading-snug">{message}</span>
          <button
            type="button"
            onClick={() => setHidden(key)}
            aria-label={t("dismiss")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <Icon name="x" className="size-4" />
          </button>
          {/* Runs down over the 4 s the toast stays. */}
          <span
            aria-hidden
            className="toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-emerald-400/80"
          />
        </div>
      )}
    </div>
  );
}
