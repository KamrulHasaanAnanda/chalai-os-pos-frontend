import { callApi } from "@/lib/api-route";

/**
 * Can this POS reach Chalai right now? The browser's online flag only knows about Wi-Fi, so the till asks here
 * (lib/offline/outbox.ts `probe`). It goes all the way to the API: a 5xx or no answer means work offline.
 */
export async function GET() {
  return callApi(async (api) => {
    await api.sync();
    return { ok: true };
  });
}
