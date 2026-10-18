import type { PaymentMethod, TransferAccount } from "@smartpos/shared";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};

// Which account a bank transfer went to.
export const TRANSFER_ACCOUNT_LABELS: Record<TransferAccount, string> = {
  PERSONAL: "Cá nhân (CN)",
  BUSINESS: "Doanh nghiệp (HKD)",
};
export const TRANSFER_ACCOUNT_SHORT: Record<TransferAccount, string> = { PERSONAL: "CN", BUSINESS: "HKD" };

// "Chuyển khoản CN" for a transfer to the personal account, "Tiền mặt" for cash, and so on.
export function paymentLabel(method: string, account?: TransferAccount | null): string {
  const base = PAYMENT_LABELS[method as PaymentMethod] ?? method;
  return method === "BANK_TRANSFER" && account ? `${base} ${TRANSFER_ACCOUNT_SHORT[account]}` : base;
}
