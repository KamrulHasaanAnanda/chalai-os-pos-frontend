"use client";
// Client component: opening the browser's print dialog needs window.print().

import type { ReactNode } from "react";

export function PrintButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
