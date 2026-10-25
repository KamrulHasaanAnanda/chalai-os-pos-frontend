import "server-only";
import { cache } from "react";
import { load } from "@/lib/session";

/** One GET /pos/orders/:id per request, shared by generateMetadata and the page. */
export const getOrder = cache((id: string) => load((api) => api.order(id)));
