"use client";
// Client component: live timers that turn tickets red when late, instant Start / Ready taps (optimistic),
// the optional new-ticket sound (setting kept in localStorage) and full-screen mode for a wall TV.

import { useTranslations } from "next-intl";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
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
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
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

/** How often a visible kitchen board tells the API it is alive; 30 s without one starts the POS printer fallback. */
const HEARTBEAT_MS = 10_000;

/**
 * Kitchen heartbeat. A hidden tab (screen off, another app in front) stays silent on purpose: nobody is reading the
 * board, so the POS should print. The static demo has no API.
 */
function useKitchenHeartbeat() {
  useEffect(() => {
    if (process.env.CHALAI_DEMO === "1") return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/kitchen/heartbeat", { method: "POST" }).catch(() => undefined);
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
}

export function KitchenBoard({ tickets }: { tickets: KitchenTicket[] }) {
  useKitchenHeartbeat();
  const t = useTranslations("kitchen");
  const tErrors = useTranslations("errors");
  const now = useNow();
  const [optimistic, applyOptimistic] = useOptimistic(
    tickets,
    (state, change: { roundId: string; status: Status }) =>
      state.map((ticket) =>
        ticket.roundId === change.roundId
          ? { ...ticket, status: change.status }
          : ticket,
      ),
  );
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => false);

  // New tickets since the last render → chime (only when the cook turned sound on, and not on first load).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(
      tickets
        .filter((ticket) => ticket.status === "queued")
        .map((ticket) => ticket.roundId),
    );
    if (seen.current && sound && [...ids].some((id) => !seen.current!.has(id)))
      chime();
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
    else
      void document.documentElement
        .requestFullscreen?.()
        .catch(() => undefined);
  };

  const move = (ticket: KitchenTicket, status: "preparing" | "ready") => {
    setError(null);
    setBusy(ticket.roundId);
    startTransition(async () => {
      applyOptimistic({ roundId: ticket.roundId, status });
      const code = await setTicketStatus(ticket.roundId, status);
      setBusy(null);
      if (code)
        setError(
          tErrors.has(code as "unknown")
            ? tErrors(code as "unknown")
            : tErrors("unknown"),
        );
    });
  };

  const since = (ticket: KitchenTicket) =>
    new Date(ticket.approvedAt ?? ticket.createdAt).getTime();
  const isLate = (ticket: KitchenTicket) =>
    ticket.status !== "ready" && now !== null && now - since(ticket) > LATE_MS;
  const lateCount = optimistic.filter(isLate).length;
  const count = (status: Status) =>
    optimistic.filter((x) => x.status === status).length;

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col">
      {/* Top bar: the numbers a cook glances at, plus sound and full screen. */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-3 sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {columns.map((column) => (
            <span
              key={column}
              className="flex h-11 items-center gap-2.5 rounded-xl bg-white/[0.06] pr-4 pl-3 ring-1 ring-white/10"
            >
              <span
                aria-hidden
                className={cn("size-2.5 rounded-full", LOOK[column].dot)}
              />
              <span className="text-[15px] font-semibold text-zinc-300">
                {t(`columns.${column}`)}
              </span>
              <span className="text-[20px] font-bold text-white tabular-nums">
                {count(column)}
              </span>
            </span>
          ))}
          {lateCount > 0 && (
            <span className="flex h-11 animate-pulse items-center gap-2 rounded-xl bg-red-600 px-4 text-[16px] font-bold text-white">
              <Icon name="alert" className="size-5" />
              {t("lateCount", { n: lateCount })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold ring-1 transition-colors",
            sound
              ? "bg-white text-zinc-900 ring-white"
              : "bg-white/[0.06] text-zinc-300 ring-white/10 hover:bg-white/10",
          )}
        >
          <Icon name={sound ? "sound" : "mute"} className="size-5" />
          {sound ? t("soundOn") : t("soundOff")}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-11 items-center gap-2 rounded-xl bg-white/[0.06] px-4 text-[15px] font-semibold text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/10"
        >
          <Icon name="maximize" className="size-5" />
          {t("fullscreen")}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mx-4 mb-3 rounded-xl bg-red-600 px-4 py-3 text-[17px] font-bold text-white sm:mx-6"
        >
          {error}
        </p>
      )}

      <div className="grid flex-1 gap-3 px-4 pb-4 sm:px-6 md:grid-cols-3">
        {columns.map((column) => {
          const list = optimistic
            .filter((ticket) => ticket.status === column)
            .sort((a, b) => (column === "ready" ? 0 : since(a) - since(b)));
          const look = LOOK[column];
          return (
            <section
              key={column}
              aria-labelledby={`col-${column}`}
              className="flex min-h-[240px] flex-col overflow-hidden rounded-2xl bg-white/[0.035] ring-1 ring-white/[0.07]"
            >
              <div aria-hidden className={cn("h-1", look.dot)} />
              <h2
                id={`col-${column}`}
                className="flex items-center gap-2.5 px-4 pt-3.5 pb-3 text-white"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    look.chip,
                  )}
                >
                  <Icon name={look.icon} className="size-5" />
                </span>
                <span className="text-[20px] font-bold lg:text-[22px]">
                  {t(`columns.${column}`)}
                </span>
                <span className="ml-auto flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/10 px-2 text-[17px] font-bold tabular-nums">
                  {list.length}
                </span>
              </h2>

              <ul className="flex flex-col gap-3 px-3 pb-3">
                {list.length === 0 && (
                  <li className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/10 px-4 py-10 text-center text-[16px] font-medium text-zinc-500">
                    <Icon name={look.icon} className="size-7 opacity-60" />
                    {t(`empty.${column}`)}
                  </li>
                )}
                {list.map((ticket) => {
                  const elapsed = now === null ? null : now - since(ticket);
                  const late = isLate(ticket);
                  const readyFor =
                    ticket.readyAt && now !== null
                      ? now - new Date(ticket.readyAt).getTime()
                      : null;
                  const timer = column === "ready" ? readyFor : elapsed;
                  const progress =
                    elapsed === null
                      ? 0
                      : Math.min(100, (elapsed / LATE_MS) * 100);
                  const pieces = ticket.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  );
                  return (
                    <li
                      key={ticket.roundId}
                      className={cn(
                        "overflow-hidden rounded-xl bg-white text-zinc-900 shadow-lg shadow-black/30",
                        late && "ring-4 ring-red-500",
                      )}
                    >
                      {/* Ticket head: who it's for, and how long it has been waiting. */}
                      <div
                        className={cn(
                          "flex items-stretch",
                          late ? "bg-red-600 text-white" : look.head,
                        )}
                      >
                        <div className="flex min-w-[76px] items-center justify-center bg-black/15 px-3 text-[34px] leading-none font-black lg:text-[40px]">
                          {ticket.tableLabel ?? (
                            <Icon name="bag" className="size-8" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 px-3.5 py-2.5">
                          <p className="truncate text-[15px] font-bold lg:text-[16px]">
                            {ticket.tableLabel
                              ? ticket.areaName
                              : t("takeaway")}
                          </p>
                          <p className="text-[13.5px] font-semibold opacity-80 tabular-nums">
                            {t("order", { number: ticket.orderNumber })} ·{" "}
                            {t("items", { n: pieces })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end justify-center px-3.5 py-2.5 text-right">
                          <p className="text-[26px] leading-none font-black tabular-nums lg:text-[30px]">
                            {timer === null ? "–" : formatElapsed(timer)}
                          </p>
                          <p className="mt-1 text-[11.5px] font-bold tracking-wide uppercase opacity-80">
                            {late
                              ? t("late")
                              : column === "ready"
                                ? t("readyAgo")
                                : t("waiting")}
                          </p>
                        </div>
                      </div>
                      {column !== "ready" && (
                        <div className="h-1.5 bg-zinc-100">
                          <div
                            className={cn(
                              "h-full transition-[width] duration-1000",
                              late
                                ? "bg-red-600"
                                : progress > 66
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      {/* What to cook. */}
                      <ul className="divide-y divide-zinc-100 px-3.5">
                        {ticket.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 py-2.5"
                          >
                            <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-1.5 text-[19px] font-black text-white tabular-nums lg:h-10 lg:min-w-10 lg:text-[21px]">
                              {item.quantity}
                            </span>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="text-[20px] leading-tight font-bold lg:text-[23px]">
                                {item.name}
                              </p>
                              {item.note && (
                                <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-[15px] font-bold text-amber-900 lg:text-[16px]">
                                  <Icon name="alert" className="size-4" />
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {ticket.note && (
                        <p className="mx-3.5 mb-1 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-[15.5px] font-bold text-amber-900 lg:text-[17px]">
                          {t("note", { note: ticket.note })}
                        </p>
                      )}

                      <div className="p-3 pt-2">
                        {column === "ready" ? (
                          <p className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-50 text-[16px] font-bold text-emerald-700">
                            <Icon name="bell" className="size-5" />
                            {t("waitingPickup")}
                          </p>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === ticket.roundId}
                            onClick={() =>
                              move(
                                ticket,
                                column === "queued" ? "preparing" : "ready",
                              )
                            }
                            className={cn(
                              "flex h-16 w-full items-center justify-center gap-2.5 rounded-lg text-[21px] font-black text-white transition active:scale-[0.99] disabled:opacity-60 lg:text-[23px]",
                              column === "queued"
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-emerald-600 hover:bg-emerald-700",
                            )}
                          >
                            <Icon
                              name={
                                busy === ticket.roundId
                                  ? "spinner"
                                  : column === "queued"
                                    ? "flame"
                                    : "check"
                              }
                              className={cn(
                                "size-7",
                                busy === ticket.roundId && "animate-spin",
                              )}
                            />
                            {column === "queued"
                              ? t("startCooking")
                              : t("markReady")}
                          </button>
                        )}
                      </div>
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

/** One colour per stage, used on the top bar, column header and ticket head. */
const LOOK: Record<
  Status,
  { dot: string; chip: string; head: string; icon: "bell" | "flame" | "check" }
> = {
  queued: {
    dot: "bg-amber-400",
    chip: "bg-amber-400 text-amber-950",
    head: "bg-amber-400 text-amber-950",
    icon: "bell",
  },
  preparing: {
    dot: "bg-orange-500",
    chip: "bg-orange-500 text-white",
    head: "bg-orange-500 text-white",
    icon: "flame",
  },
  ready: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-500 text-white",
    head: "bg-emerald-600 text-white",
    icon: "check",
  },
};
