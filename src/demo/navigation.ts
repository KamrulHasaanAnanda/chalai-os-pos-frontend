// Frontend-only demo: the browser versions of the server actions end the way the real ones do, with a redirect
// (?ok= for the toast, ?error= for the form). They run outside React, so the demo pages hand them the router.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

let router: ReturnType<typeof useRouter> | null = null;

/** Called by every demo page (src/demo/pages.tsx), so actions can navigate without a full reload. */
export function useActionRouter() {
  const current = useRouter();
  useEffect(() => {
    router = current;
  }, [current]);
}

export function go(href: string) {
  if (router) router.push(href);
  else window.location.assign(href);
}
