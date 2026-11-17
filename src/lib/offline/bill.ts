// The bill an offline order will have on the server: the same steps and rounding as chalai-os-api
// src/billing/bill.ts (no discounts offline). All paisa.

export type BillSettings = { vatPercent: number; vatMode: "exclusive" | "inclusive"; serviceChargePercent: number; roundToTaka: boolean };

const roundHalfUp = (n: number, d: number) => Math.floor((2 * n + d) / (2 * d));
const hundredths = (percent: number) => Math.round(percent * 100);
const percentOf = (amount: number, h: number) => roundHalfUp(amount * h, 10_000);

export function offlineBill(lines: { unitPricePaisa: number; quantity: number }[], s: BillSettings, paidPaisa = 0) {
  const vat = hundredths(s.vatPercent);
  const netPaisa = lines.reduce((sum, l) => sum + l.unitPricePaisa * l.quantity, 0);
  const serviceChargePaisa = percentOf(netPaisa, hundredths(s.serviceChargePercent));
  let vatPaisa: number;
  let chargePaisa: number;
  if (s.vatMode === "exclusive") {
    vatPaisa = percentOf(netPaisa + serviceChargePaisa, vat);
    chargePaisa = netPaisa + serviceChargePaisa + vatPaisa;
  } else {
    const onService = percentOf(serviceChargePaisa, vat);
    vatPaisa = roundHalfUp(netPaisa * vat, 10_000 + vat) + onService;
    chargePaisa = netPaisa + serviceChargePaisa + onService;
  }
  const payablePaisa = s.roundToTaka ? roundHalfUp(chargePaisa, 100) * 100 : chargePaisa;
  return { netPaisa, serviceChargePaisa, vatPaisa, roundingPaisa: payablePaisa - chargePaisa, payablePaisa, duePaisa: Math.max(0, payablePaisa - paidPaisa) };
}
