"use client";
// Shows one part of a page full screen (the Tables board on a wall screen or tablet). Esc or the button exits.

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

const subscribe = (change: () => void) => {
  document.addEventListener("fullscreenchange", change);
  return () => document.removeEventListener("fullscreenchange", change);
};
const noop = () => () => {};

export function FullscreenButton({
  targetId,
  className,
}: {
  targetId: string;
  className?: string;
}) {
  const t = useTranslations("floor");
  const on = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement?.id === targetId,
    () => false,
  );
  // Browsers without the API (older iPhones) get no button rather than one that does nothing.
  const supported = useSyncExternalStore(
    noop,
    () => typeof document.documentElement.requestFullscreen === "function",
    () => false,
  );

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else
          void document
            .getElementById(targetId)
            ?.requestFullscreen()
            .catch(() => undefined);
      }}
      aria-pressed={on}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-input bg-white px-3.5 text-[14px] font-semibold shadow-xs hover:bg-zinc-50",
        className,
      )}
    >
      <Icon name={on ? "x" : "maximize"} className="size-4" />
      {on ? t("exitFullscreen") : t("fullscreen")}
    </button>
  );
}
