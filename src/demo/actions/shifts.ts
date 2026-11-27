// Frontend-only demo: browser stubs for src/actions/shifts.ts (next.config.ts aliases it). Static export cannot
// register server actions; the floor still renders the session UI with harmless no-ops.
import type { Shift, ShiftReport } from "@/lib/api/types";

export type ShiftResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function currentShift(): Promise<ShiftResult<Shift | null>> {
  return { ok: true, data: null };
}

export async function startShift(openingCashTaka: number | null = null): Promise<ShiftResult<Shift>> {
  const opening = openingCashTaka !== null && Number.isFinite(openingCashTaka) && openingCashTaka >= 0 ? openingCashTaka : null;
  void opening;
  return {
    ok: true,
    data: { id: "demo-shift", startedAt: new Date().toISOString(), staffName: "Demo" },
  };
}

export async function endShift(_countedCashTaka: number | null): Promise<ShiftResult<ShiftReport>> {
  return { ok: false, error: "no_shift" };
}

export async function shiftSoFar(): Promise<ShiftResult<ShiftReport>> {
  return { ok: false, error: "no_shift" };
}

export async function moveCash(
  _direction: "in" | "out",
  _amountTaka: number,
  _reason: string,
): Promise<ShiftResult<null>> {
  return { ok: true, data: null };
}

export async function recordExpense(
  _category: string,
  _amountTaka: number,
  _note: string,
): Promise<ShiftResult<null>> {
  return { ok: true, data: null };
}