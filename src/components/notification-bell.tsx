"use client";
// The bell in the top bar: everything that needs a waiter or cashier right now, on every page.
// The list comes from /api/notifications (worked out from the live floor) and reloads on any realtime event,
// when the tab comes back, and every 30 s as a fallback.

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { LIVE_CHANGED_EVENT } from "@/components/live-sync";
import type { Notification, NotificationKind } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

const LOOK: Record<NotificationKind, { icon: IconName; tile: string }> = {
  callWaiter: { icon: "bell", tile: "bg-rose-100 text-rose-700" },
  callWater: { icon: "bell", tile: "bg-sky-100 text-sky-700" },
  approve: { icon: "inbox", tile: "bg-orange-100 text-orange-700" },
  bill: { icon: "receipt", tile: "bg-blue-100 text-blue-700" },
  ready: { icon: "checkCircle", tile: "bg-emerald-100 text-emerald-700" },
  booking: { icon: "clock", tile: "bg-cyan-100 text-cyan-700" },
};

export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyCall, setBusyCall] = useState<string | null>(null);
  // Ids already seen with the panel open; the badge counts the rest.
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setItems((await response.json()) as Notification[]);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One burst of realtime events becomes one reload.
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") soon();
    };
    soon();
    const poll = setInterval(load, POLL_MS);
    window.addEventListener(LIVE_CHANGED_EVENT, soon);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener(LIVE_CHANGED_EVENT, soon);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Close on a click outside or Esc (focus goes back to the bell).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = items ?? [];
  const unseen = list.filter((n) => !seen.has(n.id)).length;
  const toggle = () => {
    setOpen((was) => {
      if (!was) {
        setSeen(new Set(list.map((n) => n.id)));
        setNow(Date.now());
      }
      return !was;
    });
  };

  const place = (n: Notification) =>
    n.token !== undefined
      ? t("pickup", { token: n.token })
      : t("table", { label: n.table ?? "" });
  const clock = (iso: string) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Dhaka",
    }).format(new Date(iso));
  const title = (n: Notification) =>
    n.kind === "booking"
      ? t("booking", {
          time: n.at ? clock(n.at) : "",
          name: n.name ?? "",
          n: n.partySize ?? 0,
        })
      : t(n.kind, { place: place(n) });
  const detail = (n: Notification) => {
    if (n.kind === "booking")
      return n.table
        ? t("bookingTable", { table: n.table })
        : t("bookingWaitlist");
    if (n.callId && n.at) {
      const minutes = Math.max(
        0,
        Math.floor((now - new Date(n.at).getTime()) / 60_000),
      );
      return minutes < 1 ? t("justNow") : t("ago", { n: minutes });
    }
    return null;
  };

  const done = async (callId: string) => {
    setBusyCall(callId);
    // Gone at once; a failed request brings it back on the reload.
    setItems((current) => current?.filter((n) => n.callId !== callId) ?? null);
    await fetch(`/api/notifications/calls/${encodeURIComponent(callId)}/done`, {
      method: "POST",
    }).catch(() => undefined);
    setBusyCall(null);
    void load();
  };

  return (
    <div ref={box} className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unseen > 0 ? t("open", { n: unseen }) : t("title")}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-lg border bg-white text-zinc-700 shadow-xs transition-colors hover:bg-zinc-50 hover:text-zinc-900",
          open && "border-zinc-400 bg-zinc-50 text-zinc-900",
        )}
      >
        <Icon
          name="bell"
          className={cn(
            "size-[18px]",
            unseen > 0 && "origin-top animate-[bell-ring_1s_ease-in-out_2]",
          )}
        />
        {unseen > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-white tabular-nums">
            {unseen > 99 ? "99+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute top-[calc(100%+8px)] right-0 z-50 flex max-h-[min(70dvh,560px)] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] max-sm:fixed max-sm:top-16 max-sm:right-3"
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="text-[15px] font-bold">{t("title")}</h2>
            {list.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-700 tabular-nums">
                {list.length}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {items === null && !failed ? (
              <ul className="divide-y" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="size-9 animate-pulse rounded-lg bg-zinc-100" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-3.5 w-3/4 animate-pulse rounded bg-zinc-100" />
                      <span className="block h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : failed && list.length === 0 ? (
              <p
                role="alert"
                className="px-4 py-8 text-center text-[13.5px] text-red-700"
              >
                {t("failed")}
              </p>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
                >
                  <Icon name="checkCircle" className="size-5" />
                </span>
                <p className="mt-3 text-[14.5px] font-semibold">{t("empty")}</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {t("emptyBody")}
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {list.map((n) => {
                  const look = LOOK[n.kind];
                  const sub = detail(n);
                  const fresh = !seen.has(n.id);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "flex items-center gap-2 pr-3",
                        fresh && "bg-amber-50/60",
                      )}
                    >
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            look.tile,
                          )}
                        >
                          <Icon name={look.icon} className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] leading-snug font-semibold">
                            {title(n)}
                          </span>
                          {sub && (
                            <span className="mt-0.5 block text-[12.5px] text-muted-foreground tabular-nums">
                              {sub}
                            </span>
                          )}
                        </span>
                      </Link>
                      {n.callId && (
                        <button
                          type="button"
                          disabled={busyCall === n.callId}
                          onClick={() => done(n.callId!)}
                          className="h-8 shrink-0 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {t("done")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/incoming"
            onClick={() => setOpen(false)}
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 border-t text-[13.5px] font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("seeIncoming")}
            <Icon name="go" className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
