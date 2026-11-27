// Frontend-only demo: browser stubs for src/actions/attendance.ts (next.config.ts aliases it).
import type { ClockState } from "@/lib/api/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function myAttendance(): Promise<Result<ClockState | null>> {
  return { ok: true, data: null };
}

export async function clockAction(_input: { mobile?: string; pin?: string } = {}): Promise<Result<ClockState>> {
  return { ok: false, error: "demo" };
}

export async function advanceStaffAction(): Promise<Result<{ id: string; name: string; role: string }[]>> {
  return { ok: true, data: [] };
}

export async function giveAdvanceAction(
  _staffId: string,
  _amountTaka: number,
  _note: string,
): Promise<Result<null>> {
  return { ok: true, data: null };
}