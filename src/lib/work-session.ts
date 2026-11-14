"use client";
// A staff member's work session: started at the beginning of their day, ended before they log out.
// Kept in this device's localStorage for now: the POS API has no session endpoint yet.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type WorkSession = { startedAt: string; by: string };

const EVENT = "chalai-pos-session";
const keyFor = (userId: string) => `chalai-pos-session:${userId}`;

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string | null): WorkSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as WorkSession;
    return typeof s.startedAt === "string" ? s : null;
  } catch {
    return null;
  }
}

/** The user's session, null when none is open, or "pending" before localStorage has been read (server render). */
export function useWorkSession(userId: string): WorkSession | null | "pending" {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(keyFor(userId));
      } catch {
        return null;
      }
    },
    () => "pending",
  );
  return useMemo(() => (raw === "pending" ? "pending" : parse(raw)), [raw]);
}

export function startWorkSession(userId: string, name: string) {
  save(userId, { startedAt: new Date().toISOString(), by: name });
}

export function endWorkSession(userId: string) {
  save(userId, null);
}

function save(userId: string, session: WorkSession | null) {
  try {
    if (session)
      window.localStorage.setItem(keyFor(userId), JSON.stringify(session));
    else window.localStorage.removeItem(keyFor(userId));
  } catch {
    // Private mode or blocked storage: the session just won't survive a reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Minutes the session has been open, refreshed every 30 seconds. */
export function useSessionMinutes(
  session: WorkSession | null | "pending",
): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!session || session === "pending") return 0;
  return Math.max(
    0,
    Math.floor((now - new Date(session.startedAt).getTime()) / 60000),
  );
}

export const clockTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
