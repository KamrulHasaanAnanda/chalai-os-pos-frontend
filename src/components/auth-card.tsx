/* eslint-disable @next/next/no-img-element -- small brand SVG, no optimisation needed */
import type { ReactNode } from "react";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Centered card on a warm background, for login, password change and the plan page. */
export function AuthCard({ title, body, children, footer }: { title: string; body?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-10%,#fff3cc_0%,#faf6ee_55%)] px-4 py-10">
      <img src="/brand/logo-en-on-light.svg" alt="Chalai" width={340} height={120} className="mb-8 h-10 w-auto" />
      <div className={cn(cardClass, "w-full max-w-[420px] p-6 sm:p-8")}>
        <h1 className="text-[24px] leading-tight font-extrabold tracking-[-0.01em]">{title}</h1>
        {body && <p className="mt-1.5 text-[15px] text-muted-foreground">{body}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </main>
  );
}
