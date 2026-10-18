import { vnDayOf } from "./payment-kind.js";

export interface BalancePayment {
  createdAt: Date;
  amount: number;
}

export interface OpenBalanceLine {
  // Vietnam-local day (YYYY-MM-DD) the first money was taken, i.e. the day the customer bought
  boughtOn: string;
  // what the customer still had to pay on the sheet of that day
  amount: number;
  // the balance was paid on this very day: the line is crossed out here and gone from the next day's sheet
  struck: boolean;
}

// What the back of a day's thu-chi sheet says about one invoice that was only partly paid when it was bought
// (a deposit): null when it does not belong on that day's sheet.
//  - before the day it was bought: not there yet;
//  - bought on that day or any later day up to the day it is settled: written, with what is still owed;
//  - on the day the balance is paid: still written, but crossed out (the money itself goes on the front);
//  - after that: gone.
// `owed` is what the customer has to pay in cash/transfer/card (invoice total minus a pre-order deposit).
export function openBalanceOnDay(payments: BalancePayment[], owed: number, day: string): OpenBalanceLine | null {
  const sorted = [...payments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = sorted[0];
  if (!first) return null;

  const boughtOn = vnDayOf(first.createdAt);
  if (boughtOn > day) return null;

  // Same rule as the front of the sheet (classifyPayment): paid in full on the very first day is a plain sale.
  const paidFirstDay = sorted.filter((p) => vnDayOf(p.createdAt) === boughtOn).reduce((s, p) => s + p.amount, 0);
  const paidTotal = sorted.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(paidFirstDay - owed) <= 0.5 && Math.abs(paidTotal - owed) <= 0.5) return null;

  let running = 0;
  let settledOn: string | null = null;
  for (const p of sorted) {
    running += p.amount;
    if (running >= owed - 0.5) {
      settledOn = vnDayOf(p.createdAt);
      break;
    }
  }
  if (settledOn !== null && settledOn < day) return null;

  const struck = settledOn === day;
  // A crossed-out line keeps the amount it was written with, i.e. what was owed before the day's payments.
  const paidBefore = sorted
    .filter((p) => (struck ? vnDayOf(p.createdAt) < day : vnDayOf(p.createdAt) <= day))
    .reduce((s, p) => s + p.amount, 0);
  const amount = Math.max(0, owed - paidBefore);
  if (amount <= 0.5) return null;

  return { boughtOn, amount, struck };
}
