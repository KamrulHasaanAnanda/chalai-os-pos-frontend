"use client";
// Nothing on the POS works until the person has started today's session. While it isn't started (or yesterday's is
// still open) the page and the menu are greyed out and can't be clicked, and a card on top asks to start it.
// The API refuses the same actions (ShiftOpenGuard), so this is the friendly half of the rule.
import { useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { SessionBar } from "@/components/session-bar";
import { useWorkSession } from "@/lib/work-session";
import { cn } from "@/lib/utils";

/** True inside a locked page: the page's own session bar hides, since the lock card shows one. */
export const SessionLocked = createContext(false);

export function useSessionLocked() {
  return useContext(SessionLocked);
}

export function SessionGate({
  userId,
  userName,
  nav = false,
  children,
}: {
  userId: string;
  userName: string;
  /** The menu: greyed out and not clickable while locked, with no card. */
  nav?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("session");
  const session = useWorkSession(userId);
  const pending = session === "pending";
  const stale = !!session && session !== "pending" && !session.today;
  const locked = session === null || stale;

  if (nav) {
    return (
      <div
        inert={locked || pending}
        className={cn("transition-opacity", locked && "opacity-35")}
      >
        {children}
      </div>
    );
  }
  if (pending) return <div inert>{children}</div>;
  if (!locked)
    return (
      <SessionLocked.Provider value={false}>{children}</SessionLocked.Provider>
    );

  return (
    <SessionLocked.Provider value={true}>
      <div className="relative">
        {/* Centred on the screen (beside the sidebar), over the greyed-out page. */}
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-zinc-950/45 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-4 md:left-64 md:pb-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-lock-title"
            className="max-h-[min(90dvh,720px)] w-full max-w-[420px] overflow-y-auto rounded-2xl border bg-card p-4 shadow-[0_32px_64px_-16px_rgb(0_0_0/0.45)] sm:max-w-[480px] sm:p-5"
          >
            <div className="mb-4 flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
              >
                <Icon name="shield" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="session-lock-title"
                  className="text-[18px] font-bold tracking-tight"
                >
                  {stale ? t("staleTitle") : t("lockTitle")}
                </h2>
                <p className="mt-0.5 text-[14px] text-muted-foreground">
                  {stale ? t("staleBody") : t("lockBody")}
                </p>
              </div>
            </div>
            <SessionBar userId={userId} userName={userName} inGate />
          </section>
        </div>
        <div
          inert
          aria-hidden
          className="pointer-events-none select-none opacity-35 grayscale"
        >
          {children}
        </div>
      </div>
    </SessionLocked.Provider>
  );
}
