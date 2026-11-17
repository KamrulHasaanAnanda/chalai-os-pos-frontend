import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { callApi } from "@/lib/api-route";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** The only writes the offline outbox may replay. */
const ALLOWED = [
  new RegExp(`^/pos/orders$`),
  new RegExp(`^/pos/orders/${UUID}/rounds$`),
  new RegExp(`^/pos/orders/${UUID}/payments$`),
  /^\/pos\/shifts\/current\/cash$/,
];

/** Replays one outbox entry with its Idempotency-Key. API errors come back with their status and code. */
export async function POST(request: NextRequest) {
  const entry = (await request.json().catch(() => null)) as { path?: unknown; body?: unknown; key?: unknown } | null;
  const path = typeof entry?.path === "string" ? entry.path : "";
  const key = typeof entry?.key === "string" ? entry.key.slice(0, 100) : "";
  if (!ALLOWED.some((re) => re.test(path)) || !key) return NextResponse.json({ code: "bad_outbox_entry" }, { status: 400 });
  return callApi((api) => api.replay(path, entry?.body ?? {}, key));
}
