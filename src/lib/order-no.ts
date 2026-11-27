/** An order number as staff say it: #003 (at least three digits). */
export const orderNo = (n: number) => `#${String(n).padStart(3, "0")}`;
