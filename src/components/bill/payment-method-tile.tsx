import type { PaymentMethod } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const styles: Record<Exclude<PaymentMethod, "credit">, string> = {
  cash: "font-bold text-emerald-800",
  bkash: "font-black tracking-tight text-[#e2136e]",
  nagad: "font-black tracking-tight text-[#f15a22]",
  card: "font-bold text-blue-700",
};

/** Brand-styled labels without placeholder dots. */
export function PaymentMethodMark({ method }: { method: PaymentMethod }) {
  if (method === "credit") {
    return <span className="text-[13px] font-bold text-amber-800">Credit</span>;
  }
  const label =
    method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : method === "card" ? "Card" : "Cash";
  return <span className={cn("text-[15px] leading-none", styles[method])}>{label}</span>;
}