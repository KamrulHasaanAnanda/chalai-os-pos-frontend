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

export async function startShift(): Promise<ShiftResult<Shift>> {
  await requireStaff();
  const result = await act((api) => api.startShift());
  return result.ok ? { ok: true, data: result.data.shift } : { ok: false, error: result.error.code };
}

/** `countedCashTaka` null skips the cash count. */
export async function endShift(countedCashTaka: number | null): Promise<ShiftResult<ShiftReport>> {
  await requireStaff();
  const counted = countedCashTaka !== null && Number.isFinite(countedCashTaka) && countedCashTaka >= 0 ? countedCashTaka : null;
  const result = await act((api) => api.endShift(counted));
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error.code };
}
