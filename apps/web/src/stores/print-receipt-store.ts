import { create } from "zustand";
import type { PaymentMethod } from "@smartpos/shared";

export interface ReceiptItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

// "Gộp hàng cùng loại" (print settings): collapses multiple lines of the same
// product — e.g. from the cart's "+" duplicate-line button — into one printed
// row with summed quantity/discount/total, instead of a row per cart line.
export function mergeSameProductItems(items: ReceiptItem[]): ReceiptItem[] {
  const merged = new Map<string, ReceiptItem>();
  for (const item of items) {
    const existing = merged.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.discount += item.discount;
      existing.lineTotal += item.lineTotal;
    } else {
      merged.set(item.productId, { ...item });
    }
  }
  return [...merged.values()];
}

export interface ReceiptPayment {
  method: PaymentMethod;
  amount: number;
}

export interface ReceiptData {
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  code: string;
  date: string;
  cashierName: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  payments: ReceiptPayment[];
}

interface PrintReceiptState {
  data: ReceiptData | null;
  requestId: number;
  print: (data: ReceiptData) => void;
}

export const usePrintReceiptStore = create<PrintReceiptState>((set) => ({
  data: null,
  requestId: 0,
  print: (data) => set((s) => ({ data, requestId: s.requestId + 1 })),
}));
