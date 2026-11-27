"use client";
// Client component: puts a page's title into the left of the shell's top bar (#topbar-start), so the top bar and
// the page head are one row on tablets and laptops. Phones keep the page's own head (the slot is hidden there).

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

export function TopBarStart({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(
    noop,
    () => document.getElementById("topbar-start"),
    () => null,
  );
  return slot ? createPortal(children, slot) : null;
}
