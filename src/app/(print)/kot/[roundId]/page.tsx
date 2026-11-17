import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { KotFramePrint, PrintKotNow } from "@/components/print/kot-print";
import { KotSlip } from "@/components/print/kot-slip";
import { buttonVariants } from "@/components/ui/button";
import { floorRoles, load, requireStaff } from "@/lib/session";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/kot/[roundId]">): Promise<Metadata> {
  const t = await getTranslations("kot");
  const { roundId } = await params;
  const kot = await load((api) => api.kot(roundId));
  return { title: t("title", { number: kot.orderNumber, round: kot.roundNumber }) };
}

/**
 * A KOT in the restaurant's paper width. `?frame=1` is the POS's hidden print frame: it prints by itself
 * (`&fallback=1` when the kitchen screen was silent). Without it, a page with Print / Back for a hand print.
 */
export default async function KotPage({ params, searchParams }: PageProps<"/kot/[roundId]">) {
  const { roundId } = await params;
  const query = await searchParams;
  const { restaurant } = await requireStaff({ roles: floorRoles });
  const kot = await load((api) => api.kot(roundId));
  const t = await getTranslations("kot");
  const width = restaurant.receiptWidthMm ?? 80;
  const frame = query.frame === "1";

  return (
    <div className={cn("min-h-dvh bg-gray py-6 print:bg-white print:py-0", frame && "bg-white py-0")}>
      <style>{`@page { size: ${width}mm auto; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      {frame ? (
        <KotFramePrint roundId={kot.roundId} fallback={query.fallback === "1"} />
      ) : (
        <div className="mx-auto mb-4 flex max-w-full gap-2 px-2 print:hidden" style={{ width: `${width}mm` }}>
          <PrintKotNow roundId={kot.roundId} className={cn(buttonVariants({ variant: "default" }), "flex-1")}>
            {t("print")}
          </PrintKotNow>
          <Link href={orderHref(kot.orderId)} className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
            {t("back")}
          </Link>
        </div>
      )}
      <KotSlip
        kot={kot}
        width={width}
        timeZone={restaurant.timezone}
        reprint={kot.printedAt !== null}
        fallback={query.fallback === "1" || kot.printedFallback}
      />
    </div>
  );
}
