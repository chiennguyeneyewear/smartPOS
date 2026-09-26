import type { PaymentMethod } from "@smartpos/shared";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};
