import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrintSettingsState {
  autoPrint: boolean;
  mergeSameItems: boolean;
  copies: number;
  // "Chọn mẫu in" — cửa hàng có 3 cơ sở dùng chung 1 quầy/máy in, nên người
  // bán chọn thủ công cơ sở nào đang bán hàng để tên/địa chỉ/SĐT in đúng cơ
  // sở đó, độc lập với chi nhánh đang active trên tài khoản đăng nhập.
  // null nghĩa là chưa chọn, dùng chi nhánh đang active làm mặc định.
  receiptBranchId: string | null;
  setAutoPrint: (value: boolean) => void;
  setMergeSameItems: (value: boolean) => void;
  setCopies: (value: number) => void;
  setReceiptBranchId: (value: string) => void;
  resetReceiptBranchId: () => void;
}

export const usePrintSettingsStore = create<PrintSettingsState>()(
  persist(
    (set) => ({
      autoPrint: false,
      mergeSameItems: false,
      copies: 1,
      receiptBranchId: null,
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setMergeSameItems: (mergeSameItems) => set({ mergeSameItems }),
      setCopies: (copies) => set({ copies: Math.min(9, Math.max(1, Math.round(copies) || 1)) }),
      setReceiptBranchId: (receiptBranchId) => set({ receiptBranchId }),
      resetReceiptBranchId: () => set({ receiptBranchId: null }),
    }),
    { name: "smartpos-print-settings", version: 1 },
  ),
);
