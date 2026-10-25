import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
  className,
  dark = false,
}: {
  icon?: IconName;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className={cn("flex size-14 items-center justify-center rounded-full", dark ? "bg-white/10 text-white/70" : "bg-maroon-tint text-maroon")}>
        <Icon name={icon} className="size-6" />
      </span>
      <p className={cn("mt-3 text-[16px] font-bold", dark && "text-white/90")}>{title}</p>
      {body && <p className={cn("mt-1 max-w-[380px] text-[14px]", dark ? "text-white/60" : "text-muted-foreground")}>{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
