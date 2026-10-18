import type { TransferAccount } from "@smartpos/shared";
import type { DayPayment } from "@/features/sales/api";
import { TRANSFER_ACCOUNT_SHORT } from "@/lib/payment";

export const SHORT: Record<string, string> = { CASH: "TM", BANK_TRANSFER: "CK", CARD: "QT", DEBT: "Nợ" };

// "27/9": day/month (Vietnam time) the deposit was taken, no leading zeros, like the hand-written sheet
export function depositDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// What goes in the "Chuyển khoản" cell: the amount followed by the account it went to, e.g. "300,000 HKD" or
// "1,000,000 CN". A cell holding both accounts has one per line; a transfer from before the account was recorded
// is just the amount. Cash and card never come through here.
export function transferText(payments: { amount: number; transferAccount?: TransferAccount | null }[]): string {
  const sums = new Map<TransferAccount | "", number>();
  for (const p of payments) sums.set(p.transferAccount ?? "", (sums.get(p.transferAccount ?? "") ?? 0) + p.amount);
  return (["PERSONAL", "BUSINESS", ""] as const)
    .filter((account) => sums.has(account))
    .map((account) => {
      const amount = sums.get(account)!.toLocaleString("en-US");
      return account ? `${amount} ${TRANSFER_ACCOUNT_SHORT[account]}` : amount;
    })
    .join("\n");
}

export interface Row {
  key: string;
  cash: number;
  transfer: number;
  // the transfer cell as written on the sheet: amount + CN/HKD (see transferText)
  transferText: string;
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
//  - a sale, or the deposit on one, goes under the methods it was paid with; a transfer is written with the
//    account it went to ("728,000 HKD"); a deposit also shows what is still owed in "Sau cọc còn";
//  - the balance collected later on an earlier deposit goes in its own column "Khách trả cọc", written
//    "<customer> <amount> <method> <day of the deposit>" (a transfer says CK CN / CK HKD).
export function buildRows(payments: DayPayment[]): Row[] {
  const byInvoice = new Map<string, Row>();
  const transfersByRow = new Map<string, DayPayment[]>();
  for (const p of payments) {
    const balance = p.kind === "Thu nốt";
    // a balance payment gets its own line even if the same invoice also had a sale line that day
    const key = `${p.invoiceCode}|${balance ? "balance" : "sale"}`;
    const row = byInvoice.get(key) ?? {
      key,
      cash: 0,
      transfer: 0,
      transferText: "",
      card: 0,
      owedAfter: 0,
      owedText: "",
      paidBalance: "",
      balanceParts: [],
      expenseText: "",
      expenseNote: "",
    };
    if (balance) {
      const account = p.method === "BANK_TRANSFER" && p.transferAccount ? ` ${TRANSFER_ACCOUNT_SHORT[p.transferAccount]}` : "";
      row.balanceParts.push(`${p.amount.toLocaleString("en-US")} ${SHORT[p.method] ?? ""}${account}`);
      // "Anh An 1,080,000 TM 27/9": customer, amount and method, and the day the deposit was taken
      row.paidBalance = `${p.customerName} ${row.balanceParts.join(" + ")} ${depositDay(p.firstPaidAt)}`;
    } else {
      if (p.method === "CASH") row.cash += p.amount;
      else if (p.method === "BANK_TRANSFER") {
        row.transfer += p.amount;
        transfersByRow.set(key, [...(transfersByRow.get(key) ?? []), p]);
        row.transferText = transferText(transfersByRow.get(key)!);
      } else if (p.method === "CARD") row.card += p.amount;
      // what is still owed after the last deposit payment of the day
      row.owedAfter = p.kind === "Cọc" ? p.remainingAfter : 0;
      row.owedText = row.owedAfter > 0 ? `${row.owedAfter.toLocaleString("en-US")} - ${p.customerName}` : "";
    }
    byInvoice.set(key, row);
  }
  return [...byInvoice.values()];
}
