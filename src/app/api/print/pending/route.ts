import { callApi } from "@/lib/api-route";

/** KOTs this POS should print by itself: the kitchen screen has been silent for 30 s. */
export async function GET() {
  return callApi((api) => api.printPending());
}
