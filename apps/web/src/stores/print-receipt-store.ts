import { create } from "zustand";
import type { PaymentMethod } from "@smartpos/shared";

export type ReceiptFormat = "thermal80" | "a5";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
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
  format: ReceiptFormat;
  requestId: number;
  print: (data: ReceiptData, format: ReceiptFormat) => void;
}

export const usePrintReceiptStore = create<PrintReceiptState>((set) => ({
  data: null,
  format: "thermal80",
  requestId: 0,
  print: (data, format) => set((s) => ({ data, format, requestId: s.requestId + 1 })),
}));
