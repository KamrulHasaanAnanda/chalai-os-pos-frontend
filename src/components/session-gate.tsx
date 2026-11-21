"use client";
// Nothing on the POS works until the person has started today's session. While it isn't started (or yesterday's is
// still open) the page and the menu are greyed out and can't be clicked, and a card on top asks to start it.
// The API refuses the same actions (ShiftOpenGuard), so this is the friendly half of the rule.
import { useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";
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
            className="max-h-[min(90dvh,720px)] w-full max-w-[400px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.4)]"
          >
            <h2 id="session-lock-title" className="text-[22px] leading-tight font-semibold tracking-tight">
              {stale ? t("staleTitle") : t("lockTitle")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">
              {stale ? t("staleBody") : t("lockBody")}
            </p>
            <div className="mt-5">
              <SessionBar userId={userId} userName={userName} inGate />
            </div>
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
