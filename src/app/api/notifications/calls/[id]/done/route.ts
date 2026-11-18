import { callApi } from "@/lib/api-route";

/** "Done" on a guest's call in the bell. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return callApi((api) => api.callDone(id));
}
