"use client";
// Client component: live timers that turn tickets red when late, instant Start / Ready taps (optimistic),
// the optional new-ticket sound (setting kept in localStorage) and full-screen mode for a wall TV.

import { useTranslations } from "next-intl";
import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { setTicketStatus } from "@/actions/kitchen";
import { Icon } from "@/components/icons";
import type { KitchenTicket } from "@/lib/api/types";
import { useNow } from "@/lib/clock";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";

const LATE_MS = 15 * 60 * 1000;
const SOUND_KEY = "chalai.kitchen.sound";
const SOUND_EVENT = "chalai-kitchen-sound";

type Status = KitchenTicket["status"];
const columns: Status[] = ["queued", "preparing", "ready"];

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

function subscribeSound(listener: () => void) {
  window.addEventListener(SOUND_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SOUND_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** A soft two-note chime, made on the fly (no audio file to download). */
function chime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // No audio on this device: the board still works.
  }
}

export function KitchenBoard({ tickets }: { tickets: KitchenTicket[] }) {
  const t = useTranslations("kitchen");
  const tErrors = useTranslations("errors");
  const now = useNow();
  const [optimistic, applyOptimistic] = useOptimistic(tickets, (state, change: { roundId: string; status: Status }) =>
    state.map((ticket) => (ticket.roundId === change.roundId ? { ...ticket, status: change.status } : ticket)),
  );
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => false);

  // New tickets since the last render → chime (only when the cook turned sound on, and not on first load).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(tickets.filter((ticket) => ticket.status === "queued").map((ticket) => ticket.roundId));
    if (seen.current && sound && [...ids].some((id) => !seen.current!.has(id))) chime();
    seen.current = new Set([...(seen.current ?? []), ...ids]);
  }, [tickets, sound]);

  const toggleSound = () => {
    try {
      window.localStorage.setItem(SOUND_KEY, sound ? "off" : "on");
    } catch {
      // Private mode: the toggle just won't be remembered.
    }
    window.dispatchEvent(new Event(SOUND_EVENT));
    if (!sound) chime();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const move = (ticket: KitchenTicket, status: "preparing" | "ready") => {
    setError(null);
    setBusy(ticket.roundId);
    startTransition(async () => {
      applyOptimistic({ roundId: ticket.roundId, status });
      const code = await setTicketStatus(ticket.roundId, status);
      setBusy(null);
      if (code) setError(tErrors.has(code as "unknown") ? tErrors(code as "unknown") : tErrors("unknown"));
    });
  };

  const since = (ticket: KitchenTicket) => new Date(ticket.approvedAt ?? ticket.createdAt).getTime();
  const lateCount = now === null ? 0 : optimistic.filter((x) => x.status !== "ready" && now - since(x) > LATE_MS).length;

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <p className="flex-1 text-[17px] font-bold text-white/80">
          {t("summary", {
            queued: optimistic.filter((x) => x.status === "queued").length,
            preparing: optimistic.filter((x) => x.status === "preparing").length,
          })}
          {lateCount > 0 && (
            <span className="ml-3 rounded-full bg-late px-3 py-1 text-white">
              <Icon name="alert" className="mr-1 inline size-4 align-[-2px]" />
              {t("lateCount", { n: lateCount })}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className="flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-[15.5px] font-bold text-white hover:bg-white/20"
        >
          <Icon name={sound ? "sound" : "mute"} />
          {sound ? t("soundOn") : t("soundOff")}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex min-h-12 items-center rounded-full bg-white/10 px-4 text-[15.5px] font-bold text-white hover:bg-white/20"
        >
          {t("fullscreen")}
        </button>
      </div>

      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-late px-4 py-3 text-[17px] font-bold text-white sm:mx-6">
          {error}
        </p>
      )}

      <div className="grid flex-1 gap-3 px-4 pb-4 sm:px-6 md:grid-cols-3">
        {columns.map((column) => {
          const list = optimistic.filter((ticket) => ticket.status === column);
          return (
            <section key={column} aria-labelledby={`col-${column}`} className="flex min-h-[200px] flex-col rounded-2xl bg-white/5 p-2.5">
              <h2 id={`col-${column}`} className="flex items-center justify-between px-1.5 pb-2 text-[20px] font-extrabold text-white lg:text-[24px]">
                {t(`columns.${column}`)}
                <span className="rounded-full bg-white/15 px-3 text-[18px] tabular-nums">{list.length}</span>
              </h2>
              <ul className="flex flex-col gap-2.5">
                {list.length === 0 && <li className="px-1.5 py-6 text-center text-[17px] text-white/50">{t(`empty.${column}`)}</li>}
                {list.map((ticket) => {
                  const started = since(ticket);
                  const elapsed = now === null ? null : now - started;
                  const late = column !== "ready" && elapsed !== null && elapsed > LATE_MS;
                  const readyFor = ticket.readyAt && now !== null ? now - new Date(ticket.readyAt).getTime() : null;
                  return (
                    <li
                      key={ticket.roundId}
                      className={cn(
                        "rounded-xl border-4 p-3 text-ink lg:p-4",
                        column === "queued" && "border-sun bg-white",
                        column === "preparing" && "border-brand bg-brand-soft",
                        column === "ready" && "border-ok bg-ok-soft opacity-80",
                        late && "border-late bg-[#fee2e2]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[34px] leading-none font-black lg:text-[44px]">{ticket.tableLabel ?? t("takeaway")}</p>
                          <p className="mt-1 text-[16px] font-bold text-ink/70 lg:text-[18px]">
                            {[t("order", { number: ticket.orderNumber }), ticket.areaName].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-[26px] leading-none font-black tabular-nums lg:text-[32px]",
                              late ? "text-late" : column === "ready" ? "text-ok" : "text-ink",
                            )}
                          >
                            {column === "ready"
                              ? readyFor === null
                                ? "–"
                                : formatElapsed(readyFor)
                              : elapsed === null
                                ? "–"
                                : formatElapsed(elapsed)}
                          </p>
                          {late && (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-late px-2 py-0.5 text-[14px] font-extrabold text-white">
                              <Icon name="alert" className="size-4" />
                              {t("late")}
                            </p>
                          )}
                          {column === "ready" && <p className="mt-1 text-[14px] font-bold text-ok">{t("readyAgo")}</p>}
                        </div>
                      </div>

                      <ul className="mt-3 space-y-1.5">
                        {ticket.items.map((item) => (
                          <li key={item.id} className="text-[22px] leading-tight font-extrabold lg:text-[26px]">
                            <span className="tabular-nums">{item.quantity} ×</span> {item.name}
                            {item.note && (
                              <span className="mt-0.5 block rounded-md bg-sun px-2 py-0.5 text-[17px] font-bold lg:text-[19px]">
                                {item.note}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {ticket.note && (
                        <p className="mt-2 rounded-md bg-sun px-2 py-1 text-[17px] font-bold lg:text-[19px]">{t("note", { note: ticket.note })}</p>
                      )}

                      {column !== "ready" && (
                        <button
                          type="button"
                          disabled={busy === ticket.roundId}
                          onClick={() => move(ticket, column === "queued" ? "preparing" : "ready")}
                          className={cn(
                            "mt-3 flex min-h-[64px] w-full items-center justify-center gap-2 rounded-xl text-[22px] font-black disabled:opacity-60 lg:text-[26px]",
                            column === "queued" ? "bg-ink text-white" : "bg-ok text-white",
                          )}
                        >
                          <Icon name={column === "queued" ? "flame" : "check"} className="size-7" />
                          {column === "queued" ? t("start") : t("ready")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
