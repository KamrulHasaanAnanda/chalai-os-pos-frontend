// The static demo build (CHALAI_DEMO=1, see next.config.ts) has no per-order pages: it can't list order ids at build
// time, so the order screens take the id as ?id= instead.
const demo = process.env.CHALAI_DEMO === "1";

/** The order screen, or its bill / receipt. */
export function orderHref(id: string, page?: "bill" | "receipt"): string {
  if (demo) return `/orders/${page ?? "view"}/?id=${encodeURIComponent(id)}`;
  return `/orders/${encodeURIComponent(id)}${page ? `/${page}` : ""}`;
}

/** Adds query params to a path that may already have some. */
export function withParams(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  if (!search) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${search}`;
}
