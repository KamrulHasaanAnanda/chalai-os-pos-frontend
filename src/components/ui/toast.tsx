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
      ? t(code as "saved", { number: params.get("n") ?? "", table: params.get("table") ?? "" })
      : code
        ? t("saved")
        : null;
  const visible = !!message && hidden !== key;

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:top-20 md:bottom-auto print:hidden">
      {visible && (
        <div className="toast-in pointer-events-auto flex max-w-[480px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-[15px] font-medium text-white shadow-[0_16px_40px_-12px_rgb(34_19_15/0.5)]">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ok">
            <Icon name="check" className="size-4" />
          </span>
          {message}
          <button
            type="button"
            onClick={() => setHidden(key)}
            aria-label={t("dismiss")}
            className="-mr-1 flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
