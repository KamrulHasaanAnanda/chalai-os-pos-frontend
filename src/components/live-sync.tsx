"use client";
// Client component: owns the browser's Socket.IO connection (the only browser → backend link), refreshes the
// current page when the server says something changed, and polls while the socket is down.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { LiveStatus, type LiveLabels } from "@/components/live-status";

type Payload = { tableId?: string; orderId?: string; roundId?: string; menuItemId?: string };
type Rule = { events: string[]; pollMs: number; orderId?: string };

const realtimeUrl = (process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000").replace(/\/$/, "");
const events = ["floor.changed", "order.changed", "kitchen.changed", "menu.changed"] as const;

/** Which events each page cares about, and how often it polls when the socket is disconnected. */
function ruleFor(path: string): Rule | null {
  if (path === "/floor") return { events: ["floor.changed", "order.changed"], pollMs: 20_000 };
  if (path === "/kitchen") return { events: ["kitchen.changed"], pollMs: 15_000 };
  if (path === "/orders") return { events: ["order.changed", "floor.changed"], pollMs: 30_000 };
  if (path === "/menu") return { events: ["menu.changed"], pollMs: 30_000 };
  const order = path.match(/^\/orders\/([^/]+)(?:\/bill)?$/);
  if (order) {
    return { events: ["order.changed", "kitchen.changed", "menu.changed"], pollMs: 20_000, orderId: decodeURIComponent(order[1]) };
  }
  return null;
}

export function LiveSync({ labels, dark = false }: { labels: LiveLabels; dark?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  // The event handler lives for the whole socket; it reads the current page through refs.
  const ruleRef = useRef<Rule | null>(null);
  const routerRef = useRef(router);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    ruleRef.current = ruleFor(path);
    routerRef.current = router;
  }, [path, router]);

  useEffect(() => {
    const refresh = () => {
      clearTimeout(timer.current);
      // Debounced: one burst of events (e.g. a payment that frees a table) becomes one refetch.
      timer.current = setTimeout(() => routerRef.current.refresh(), 300);
    };

    let stopped = false;
    const socket = io(`${realtimeUrl}/realtime`, {
      // Called on every (re)connection attempt, so each one uses a fresh single-use ticket.
      auth: (cb) => {
        fetch("/api/realtime-ticket", { cache: "no-store" })
          .then(async (response) => {
            if (response.status === 401) {
              // Session ended: stop retrying and let the page's own check send us to /login.
              stopped = true;
              socket.disconnect();
              routerRef.current.refresh();
              return cb({});
            }
            const body = response.ok ? ((await response.json()) as { ticket: string }) : null;
            cb(body ? { ticket: body.ticket } : {});
          })
          .catch(() => cb({}));
      },
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 15_000,
    });

    let wasLive = false;
    socket.on("connect", () => {
      setStatus("live");
      // Anything that happened while we were away was missed: catch up once.
      if (wasLive) refresh();
      wasLive = true;
    });
    socket.on("disconnect", (reason) => {
      setStatus("offline");
      // A server-side disconnect isn't retried automatically by socket.io.
      if (reason === "io server disconnect" && !stopped) setTimeout(() => socket.connect(), 3_000);
    });
    socket.on("connect_error", () => {
      setStatus("offline");
      // A rejected ticket (middleware error) isn't retried automatically either.
      if (!socket.active && !stopped) setTimeout(() => socket.connect(), 5_000);
    });

    for (const name of events) {
      socket.on(name, (payload: Payload = {}) => {
        const rule = ruleRef.current;
        if (!rule || !rule.events.includes(name)) return;
        if (name === "order.changed" && rule.orderId && payload.orderId && payload.orderId !== rule.orderId) return;
        refresh();
      });
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      socket.disconnect();
    };
  }, []);

  // Fallback polling while the socket is down (spec §11).
  useEffect(() => {
    const rule = ruleFor(path);
    if (status === "live" || !rule) return;
    const id = setInterval(() => router.refresh(), rule.pollMs);
    return () => clearInterval(id);
  }, [status, path, router]);

  return <LiveStatus status={status} labels={labels} dark={dark} />;
}
