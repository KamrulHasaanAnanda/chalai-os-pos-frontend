"use client";
// Client component: opens the browser print dialog for a KOT and tells the API it printed.

import { useEffect, useRef } from "react";

/** The message a KOT print frame posts to the page that opened it. */
export const KOT_DONE = "chalai:kot-printed";

/** Tells the API (idempotent: a reprint changes nothing). Errors are ignored: the slip is already on paper. */
export function markPrinted(roundId: string, fallback: boolean) {
  return fetch(`/api/print/tickets/${encodeURIComponent(roundId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fallback }),
  }).catch(() => undefined);
}

/**
 * Prints, then calls `after` once. Chrome blocks inside print() and fires afterprint; other browsers may return at
 * once or never fire it, so a timer backs the event up. The dialog can't tell print from cancel: both count.
 */
function printOnce(after: () => void) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("afterprint", finish);
    after();
  };
  window.addEventListener("afterprint", finish);
  window.print();
  setTimeout(finish, 1_500);
}

/** In a hidden frame (?frame=1): prints at once, records it, then tells the parent page so the next slip can go. */
export function KotFramePrint({ roundId, fallback }: { roundId: string; fallback: boolean }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    printOnce(() => {
      void markPrinted(roundId, fallback).finally(() => {
        window.parent?.postMessage({ type: KOT_DONE, roundId }, window.location.origin);
      });
    });
  }, [roundId, fallback]);
  return null;
}

/** The Print button on the KOT page: a hand print. */
export function PrintKotNow({ roundId, className, children }: { roundId: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => printOnce(() => void markPrinted(roundId, false))}>
      {children}
    </button>
  );
}
