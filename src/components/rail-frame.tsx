"use client";
// Client component: the shell is a server layout, so which page is open is read from the pathname here.
// On an order screen the sidebar folds into a 64px icon rail (more room for the menu and the ticket); it widens
// on hover or keyboard focus, and the pin button keeps it open. The look is in globals.css ([data-rail="on"]).

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

/** Order and bill screens fold the sidebar into the icon rail. */
const RAIL_PAGES = /^\/orders\/[^/]+(?:\/bill)?\/?$/;

const RailContext = createContext<{ railPage: boolean; pinned: boolean; setPinned: (v: boolean) => void }>({
  railPage: false,
  pinned: false,
  setPinned: () => {},
});

export function RailFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [pinned, setPinned] = useState(false);
  const railPage = RAIL_PAGES.test(path);
  return (
    <RailContext.Provider value={{ railPage, pinned, setPinned }}>
      <div data-rail={railPage && !pinned ? "on" : "off"} className="min-h-dvh bg-background">
        {children}
      </div>
    </RailContext.Provider>
  );
}

/** Only on rail pages: keep the sidebar open, or fold it back. */
export function RailToggle({ keepOpen, fold }: { keepOpen: string; fold: string }) {
  const { railPage, pinned, setPinned } = useContext(RailContext);
  if (!railPage) return null;
  const label = pinned ? fold : keepOpen;
  return (
    <button
      type="button"
      onClick={() => setPinned(!pinned)}
      aria-pressed={pinned}
      aria-label={label}
      title={label}
      className="rail-hide ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
    >
      <Icon name="back" className={pinned ? "size-4" : "size-4 rotate-180"} />
    </button>
  );
}
