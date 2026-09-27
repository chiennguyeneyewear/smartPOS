const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const vnDayOf = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

export interface PaymentPoint {
  id: string;
  createdAt: Date;
  amount: number;
}

export type PaymentKind = "Bán hàng" | "Cọc" | "Thu nốt";

// Labels one payment of an invoice for the day's thu-chi sheet.
//  - "Bán hàng": the whole invoice was paid on the very day the first money came in;
//  - "Cọc": money taken on that first day while something was still owed (the deposit);
//  - "Thu nốt": money collected on a later day (the balance), together with the day of the deposit.
export function classifyPayment(all: PaymentPoint[], current: PaymentPoint, owed: number) {
  const sorted = [...all].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = sorted[0] ?? current;
  const firstDay = vnDayOf(first.createdAt);
  const isFirstDay = vnDayOf(current.createdAt) === firstDay;
  const paidTotal = sorted.reduce((s, p) => s + p.amount, 0);
  const paidOnFirstDay = sorted.filter((p) => vnDayOf(p.createdAt) === firstDay).reduce((s, p) => s + p.amount, 0);
  const wholeSale = isFirstDay && Math.abs(paidOnFirstDay - owed) <= 0.5 && Math.abs(paidTotal - owed) <= 0.5;
  const kind: PaymentKind = wholeSale ? "Bán hàng" : isFirstDay ? "Cọc" : "Thu nốt";
  // what the customer still owed right after this payment came in
  const paidUpToHere = sorted.filter((p) => p.createdAt.getTime() <= current.createdAt.getTime()).reduce((s, p) => s + p.amount, 0);
  return { kind, remainingAfter: Math.max(0, owed - paidUpToHere), firstPaidAt: first.createdAt };
}
