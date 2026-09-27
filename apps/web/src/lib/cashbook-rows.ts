import type { DayPayment } from "@/features/sales/api";

export const SHORT: Record<string, string> = { CASH: "TM", BANK_TRANSFER: "CK", CARD: "QT", DEBT: "Nợ" };

// "27/9": day/month (Vietnam time) the deposit was taken, no leading zeros, like the hand-written sheet
export function depositDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export interface Row {
  key: string;
  cash: number;
  transfer: number;
  card: number;
  // Deposit rows: what the customer still owes after paying it. Balance rows: text "Trả cọc còn ...".
  owedAfter: number;
  // "740,000 - Em Đạt": what is still owed after the deposit, then whose order it is
  owedText: string;
  // "Anh An 1,080,000 TM 27/9": balance a customer paid on an earlier deposit (own column "Khách trả cọc")
  paidBalance: string;
  balanceParts: string[];
  // the expense written on this line (columns "Chi tiêu" and "Ghi chú" are independent of the receipts)
  expenseText: string;
  expenseNote: string;
}

// One line per invoice, like the paper sheet: everything the customer paid on it that day goes on the same
// line, each amount under its own method (e.g. 1,000,000 cash and 728,000 transfer side by side).
//  - a sale, or the deposit on one, goes under the methods it was paid with; a deposit also shows what is
//    still owed in "Sau cọc còn";
//  - the balance collected later on an earlier deposit goes in its own column "Khách trả cọc", written
//    "<customer> <amount> <method> <day of the deposit>".
export function buildRows(payments: DayPayment[]): Row[] {
  const byInvoice = new Map<string, Row>();
  for (const p of payments) {
    const balance = p.kind === "Thu nốt";
    // a balance payment gets its own line even if the same invoice also had a sale line that day
    const key = `${p.invoiceCode}|${balance ? "balance" : "sale"}`;
    const row = byInvoice.get(key) ?? {
      key,
      cash: 0,
      transfer: 0,
      card: 0,
      owedAfter: 0,
      owedText: "",
      paidBalance: "",
      balanceParts: [],
      expenseText: "",
      expenseNote: "",
    };
    if (balance) {
      row.balanceParts.push(`${p.amount.toLocaleString("en-US")} ${SHORT[p.method] ?? ""}`);
      // "Anh An 1,080,000 TM 27/9": customer, amount and method, and the day the deposit was taken
      row.paidBalance = `${p.customerName} ${row.balanceParts.join(" + ")} ${depositDay(p.firstPaidAt)}`;
    } else {
      if (p.method === "CASH") row.cash += p.amount;
      else if (p.method === "BANK_TRANSFER") row.transfer += p.amount;
      else if (p.method === "CARD") row.card += p.amount;
      // what is still owed after the last deposit payment of the day
      row.owedAfter = p.kind === "Cọc" ? p.remainingAfter : 0;
      row.owedText = row.owedAfter > 0 ? `${row.owedAfter.toLocaleString("en-US")} - ${p.customerName}` : "";
    }
    byInvoice.set(key, row);
  }
  return [...byInvoice.values()];
}

