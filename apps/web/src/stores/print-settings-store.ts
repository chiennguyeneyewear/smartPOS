import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReceiptFormat } from "./print-receipt-store";

interface PrintSettingsState {
  autoPrint: boolean;
  mergeSameItems: boolean;
  copies: number;
  format: ReceiptFormat;
  setAutoPrint: (value: boolean) => void;
  setMergeSameItems: (value: boolean) => void;
  setCopies: (value: number) => void;
  setFormat: (value: ReceiptFormat) => void;
}

export const usePrintSettingsStore = create<PrintSettingsState>()(
  persist(
    (set) => ({
      autoPrint: false,
      mergeSameItems: false,
      copies: 1,
      format: "thermal80",
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setMergeSameItems: (mergeSameItems) => set({ mergeSameItems }),
      setCopies: (copies) => set({ copies: Math.min(9, Math.max(1, Math.round(copies) || 1)) }),
      setFormat: (format) => set({ format }),
    }),
    { name: "smartpos-print-settings" },
  ),
);
