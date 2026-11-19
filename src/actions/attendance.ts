"use server";
// Attendance (clock in / out) and salary advances from the drawer: attendance-and-payroll spec.
import type { ClockState } from "@/lib/api/types";
import { act, requireStaff } from "@/lib/session";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function myAttendance(): Promise<Result<ClockState | null>> {
  await requireStaff();
  const r = await act((api) => api.myAttendance());
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error.code };
}

/** The signed-in person, or someone else by mobile and PIN. */
export async function clockAction(input: { mobile?: string; pin?: string } = {}): Promise<Result<ClockState>> {
  await requireStaff();
  const body = input.mobile || input.pin ? { mobile: String(input.mobile ?? "").slice(0, 20), pin: String(input.pin ?? "").slice(0, 8) } : {};
  const r = await act((api) => api.clock(body));
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error.code };
}

export async function advanceStaffAction(): Promise<Result<{ id: string; name: string; role: string }[]>> {
  await requireStaff({ roles: ["owner", "manager"] });
  const r = await act((api) => api.advanceStaff());
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error.code };
}

export async function giveAdvanceAction(staffId: string, amountTaka: number, note: string): Promise<Result<null>> {
  await requireStaff({ roles: ["owner", "manager"] });
  if (!Number.isFinite(amountTaka) || amountTaka < 1) return { ok: false, error: "bad_amount" };
  const r = await act((api) => api.giveAdvance(String(staffId), amountTaka, String(note).slice(0, 120)));
  return r.ok ? { ok: true, data: null } : { ok: false, error: r.error.code };
}
