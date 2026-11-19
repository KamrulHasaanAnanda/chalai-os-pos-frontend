"use server";
// Work shifts are kept by the API, so they survive a reload or another device, and ending one makes its report.
import type { Shift, ShiftReport } from "@/lib/api/types";
import { act, requireStaff } from "@/lib/session";

export type ShiftResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function currentShift(): Promise<ShiftResult<Shift | null>> {
  await requireStaff();
  const result = await act((api) => api.currentShift());
  return result.ok ? { ok: true, data: result.data.shift } : { ok: false, error: result.error.code };
}

/** `openingCashTaka` null means 0 in the drawer. */
export async function startShift(openingCashTaka: number | null = null): Promise<ShiftResult<Shift>> {
  await requireStaff();
  const opening = openingCashTaka !== null && Number.isFinite(openingCashTaka) && openingCashTaka >= 0 ? openingCashTaka : null;
  const result = await act((api) => api.startShift(opening));
  return result.ok ? { ok: true, data: result.data.shift } : { ok: false, error: result.error.code };
}

/** `countedCashTaka` null skips the cash count. */
export async function endShift(countedCashTaka: number | null): Promise<ShiftResult<ShiftReport>> {
  await requireStaff();
  const counted = countedCashTaka !== null && Number.isFinite(countedCashTaka) && countedCashTaka >= 0 ? countedCashTaka : null;
  const result = await act((api) => api.endShift(counted));
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error.code };
}

/** The X-report: the open shift so far. The shift stays open. */
export async function shiftSoFar(): Promise<ShiftResult<ShiftReport>> {
  await requireStaff();
  const result = await act((api) => api.shiftSoFar());
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error.code };
}

/** Cash put into or taken out of the drawer. Whole taka; the API answers bad_amount otherwise. */
export async function moveCash(direction: "in" | "out", amountTaka: number, reason: string): Promise<ShiftResult<null>> {
  await requireStaff();
  const result = await act((api) => api.moveCash(direction === "in" ? "in" : "out", amountTaka, String(reason).slice(0, 120)));
  return result.ok ? { ok: true, data: null } : { ok: false, error: result.error.code };
}

/** A cash-out that is also an expense: the API records both in one go (owner and managers only). */
export async function recordExpense(category: string, amountTaka: number, note: string): Promise<ShiftResult<null>> {
  await requireStaff();
  const result = await act((api) => api.recordExpense(category, amountTaka, String(note).slice(0, 200)));
  return result.ok ? { ok: true, data: null } : { ok: false, error: result.error.code };
}
