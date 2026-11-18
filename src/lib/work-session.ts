"use client";
// A staff member's work shift: started at the beginning of their day, ended before they log out. The API keeps it,
// so it survives a reload or another device, and ending it makes the shift report.
import { useEffect, useState, useSyncExternalStore } from "react";
import { currentShift, endShift, startShift } from "@/actions/shifts";
import type { ShiftReport } from "@/lib/api/types";

/** `today` is false for a session left open from an earlier day: work stays locked until it is ended. */
export type WorkSession = {
  id: string;
  startedAt: string;
  by: string;
  today: boolean;
};
type State = WorkSession | null | "pending";

// One shared copy per signed-in user, so the Floor bar and the logout button always agree.
const states = new Map<string, State>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function set(userId: string, state: State) {
  states.set(userId, state);
  notify();
}

async function load(userId: string) {
  if (loading.has(userId)) return;
  loading.add(userId);
  try {
    const result = await currentShift();
    // When the API can't be reached, show "not started" rather than spinning; starting will try again.
    set(userId, result.ok && result.data ? toSession(result.data) : null);
  } catch {
    // A failed request must not leave the bar loading forever.
    set(userId, null);
  } finally {
    loading.delete(userId);
  }
}

/** The calendar day in Dhaka, for an API that doesn't say whether the shift is today's. */
const dhakaDay = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

const toSession = (s: {
  id: string;
  startedAt: string;
  staffName: string;
  startedToday?: boolean;
}): WorkSession => ({
  id: s.id,
  startedAt: s.startedAt,
  by: s.staffName,
  today:
    s.startedToday ?? dhakaDay(new Date(s.startedAt)) === dhakaDay(new Date()),
});

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The user's shift, null when none is open, or "pending" while it is being loaded. */
export function useWorkSession(userId: string): State {
  const state = useSyncExternalStore(
    subscribe,
    // null is a real answer (no shift open), so only a missing entry means still loading.
    () => (states.has(userId) ? (states.get(userId) as State) : "pending"),
    () => "pending" as const,
  );
  useEffect(() => {
    if (!states.has(userId)) void load(userId);
  }, [userId]);
  return state;
}

/** Starts the shift on the server. Returns an error code when it failed. */
export async function startWorkSession(
  userId: string,
  openingCashTaka: number | null = null,
): Promise<string | null> {
  const result = await startShift(openingCashTaka);
  if (!result.ok) return result.error;
  set(userId, toSession(result.data));
  return null;
}

/** Ends the shift and returns its report, or an error code. `countedCashTaka` null skips the cash count. */
export async function endWorkSession(
  userId: string,
  countedCashTaka: number | null,
): Promise<{ report: ShiftReport } | { error: string }> {
  const result = await endShift(countedCashTaka);
  if (!result.ok) {
    // Someone ended it on another device: there is nothing open here any more.
    if (result.error === "no_open_shift") set(userId, null);
    return { error: result.error };
  }
  set(userId, null);
  return { report: result.data };
}

/** Minutes the session has been open, refreshed every 30 seconds. */
export function useSessionMinutes(session: State): number {
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
