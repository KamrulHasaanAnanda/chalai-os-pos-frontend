import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

/** Back link, title, description and actions on the right (stacking on phones). */
export function PageHeader({
  back,
  title,
  description,
  actions,
}: {
  back?: { href: string; label: string };
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      {back && (
        <Link href={back.href} className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <Icon name="back" className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold tracking-tight sm:text-[26px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
