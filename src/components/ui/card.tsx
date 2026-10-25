import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const cardClass =
  "rounded-2xl border border-line bg-white text-ink shadow-[0_1px_2px_rgb(34_19_15/0.04),0_8px_24px_-16px_rgb(80_30_10/0.18)]";

/** Card with an optional header (title, description, actions) and footer. */
export function Card({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  id,
  as: Tag = "section",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag id={id} className={cn(cardClass, "scroll-mt-24", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-[18px] leading-tight font-bold">{title}</h2>}
            {description && <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", (title || actions) && "pt-3 sm:pt-3", bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-line px-4 py-3 sm:px-5">{footer}</footer>}
    </Tag>
  );
}
