"use server";
// Reservations on the POS: the owner always; any staff member with the owner's `reservations` grant.
// The API checks the same rule, so these are just the session-bound calls.
import { revalidatePath } from "next/cache";
import type { ReservationInput, ReservationStatus } from "@/lib/api/types";
import { act } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

const done = (result: { ok: boolean; error?: { code: string } }): Result => {
  if (!result.ok) return { ok: false, error: result.error?.code ?? "other" };
  revalidatePath("/reservations");
  revalidatePath("/floor");
  return { ok: true };
};

export async function saveReservationAction(id: string | null, input: ReservationInput): Promise<Result> {
  if (id) return done(await act((api) => api.updateReservation(id, input)));
  if (!input.startsAt) return { ok: false, error: "other" };
  return done(await act((api) => api.createReservation({ ...input, startsAt: input.startsAt! })));
}

export async function setReservationStatusAction(id: string, status: ReservationStatus): Promise<Result> {
  return done(
    await act((api) => (status === "cancelled" ? api.cancelReservation(id) : api.updateReservation(id, { status }))),
  );
}
