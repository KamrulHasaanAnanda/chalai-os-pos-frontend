// Frontend-only demo: stubs for src/actions/reservations.ts (no reservations screen in the static demo).
import type { ReservationInput, ReservationStatus } from "@/lib/api/types";

type Result = { ok: true } | { ok: false; error: string };

export async function saveReservationAction(_id: string | null, _input: ReservationInput): Promise<Result> {
  return { ok: false, error: "demo" };
}

export async function setReservationStatusAction(_id: string, _status: ReservationStatus): Promise<Result> {
  return { ok: false, error: "demo" };
}