"use client";
// Client component: the POS's KOT print queue. Slips print one at a time in a hidden frame (the browser print dialog),
// so staff stay on the screen they are using. Three things fill the queue: a hand print (Print KOT button), a round
// just sent or approved when the restaurant prints KOTs (?print=<roundId>), and the kitchen-printer fallback, which
// asks the API every 15 s, and whenever the kitchen changes, for rounds the silent kitchen screen hasn't picked up.

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { KOT_DONE } from "@/components/print/kot-print";
import type { PrintPending } from "@/lib/api/types";

const PRINT_EVENT = "chalai:print-kot";
/** Sent by LiveSync when the server says `kitchen.changed`. */
export const KITCHEN_CHANGED_EVENT = "chalai:kitchen-changed";
const POLL_MS = 15_000;
/** A frame that never answers (dialog left open, page error) stops blocking the queue after this. */
const FRAME_TIMEOUT_MS = 90_000;

type Job = { roundId: string; fallback: boolean };

/** Asks this page's KOT printer to print a round (a hand print). */
export function requestKotPrint(roundId: string) {
  window.dispatchEvent(new CustomEvent<Job>(PRINT_EVENT, { detail: { roundId, fallback: false } }));
}

export function PrintKotButton({ roundId, className, children }: { roundId: string; className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => requestKotPrint(roundId)}>
      {children}
    </button>
  );
}

export function KotPrinter({ fallback, printingLabel }: { fallback: boolean; printingLabel: string }) {
  const [current, setCurrent] = useState<Job | null>(null);
  const queue = useRef<Job[]>([]);
  const busy = useRef<Job | null>(null);
  /** Fallback rounds already tried on this device: a failed or cancelled print is not retried in a loop. */
  const triedFallback = useRef(new Set<string>());
  const searchParams = useSearchParams();

  const next = useCallback(() => {
    busy.current = queue.current.shift() ?? null;
    setCurrent(busy.current);
  }, []);

  const enqueue = useCallback(
    (job: Job) => {
      if (job.fallback) {
        if (triedFallback.current.has(job.roundId)) return;
        triedFallback.current.add(job.roundId);
      }
      const waiting = busy.current?.roundId === job.roundId || queue.current.some((j) => j.roundId === job.roundId);
      if (waiting) return;
      queue.current.push(job);
      if (!busy.current) next();
    },
    [next],
  );

  // Hand prints from buttons on the page.
  useEffect(() => {
    const onPrint = (event: Event) => enqueue((event as CustomEvent<Job>).detail);
    window.addEventListener(PRINT_EVENT, onPrint);
    return () => window.removeEventListener(PRINT_EVENT, onPrint);
  }, [enqueue]);

  // A round the server action just sent or approved (?print=<roundId>). The param is removed so a reload or Back
  // doesn't print it again.
  const printParam = searchParams.get("print");
  useEffect(() => {
    if (!printParam) return;
    enqueue({ roundId: printParam, fallback: false });
    const url = new URL(window.location.href);
    url.searchParams.delete("print");
    window.history.replaceState(window.history.state, "", url);
  }, [printParam, enqueue]);

  // The frame says it printed (or the dialog closed).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; roundId?: string } | null;
      if (data?.type === KOT_DONE && data.roundId === busy.current?.roundId) next();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [next]);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(next, FRAME_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [current, next]);

  // The fallback: ask the API what the silent kitchen hasn't picked up.
  useEffect(() => {
    if (!fallback) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        const response = await fetch("/api/print/pending", { cache: "no-store" });
        if (!response.ok) return;
        const pending = (await response.json()) as PrintPending;
        if (!pending.settings.printerFallback) return;
        for (const round of pending.rounds) enqueue({ roundId: round.roundId, fallback: true });
      } catch {
        // Offline: the next poll tries again.
      }
    };
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void check(), 500);
    };
    soon();
    const poll = setInterval(() => void check(), POLL_MS);
    window.addEventListener(KITCHEN_CHANGED_EVENT, soon);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener(KITCHEN_CHANGED_EVENT, soon);
    };
  }, [fallback, enqueue]);

  if (!current) return null;
  const src = `/kot/${encodeURIComponent(current.roundId)}?frame=1${current.fallback ? "&fallback=1" : ""}`;
  return (
    <>
      <iframe
        key={current.roundId}
        src={src}
        title={printingLabel}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none fixed top-0 -left-[10000px] h-[800px] w-[420px] border-0"
      />
      <p
        role="status"
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white shadow-lg print:hidden"
      >
        {printingLabel}
      </p>
    </>
  );
}
