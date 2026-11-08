export const STOCK_MOVEMENT_TYPES = {
  IMPORT: "IMPORT",
  EXPORT: "EXPORT",
  TRANSFER: "TRANSFER",
  STOCK_TAKE: "STOCK_TAKE",
  SALE: "SALE",
  SALE_RETURN: "SALE_RETURN",
} as const;
export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const SALE_MODE = {
  QUICK: "QUICK",
  NORMAL: "NORMAL",
  DELIVERY: "DELIVERY",
} as const;
export type SaleMode = (typeof SALE_MODE)[keyof typeof SALE_MODE];

// Loại hàng của từng dòng hóa đơn: TN = tiểu ngạch, CN = chính ngạch. Chọn khi bán, ngay cạnh "Người bán".
export const GOODS_TYPE = {
  TN: "TN",
  CN: "CN",
} as const;
export type GoodsType = (typeof GOODS_TYPE)[keyof typeof GOODS_TYPE];
export const GOODS_TYPE_LABEL: Record<GoodsType, string> = {
  TN: "Tiểu ngạch",
  CN: "Chính ngạch",
};
// Loại hàng chỉ bắt đầu được ghi từ 0h ngày 08/11/2026 (giờ Việt Nam). Hóa đơn trước mốc này không có loại hàng
// và KHÔNG bị coi là "Chưa phân loại": không hiện mục đó, không tính vào biểu đồ TN/CN.
export const GOODS_TYPE_START = "2026-11-08T00:00:00+07:00";

export const GENDER = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;
export type Gender = (typeof GENDER)[keyof typeof GENDER];

export const PAYMENT_METHOD = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  CARD: "CARD",
  DEBT: "DEBT",
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// Which account a bank transfer went to: the personal account (CN) or the business one (HKD).
export const TRANSFER_ACCOUNT = {
  PERSONAL: "PERSONAL",
  BUSINESS: "BUSINESS",
} as const;
export type TransferAccount = (typeof TRANSFER_ACCOUNT)[keyof typeof TRANSFER_ACCOUNT];

// CONFIRMED = the payment method(s) are recorded; PENDING = invoice issued in one tap, method still to be confirmed.
export const PAYMENT_STATUS = {
  CONFIRMED: "CONFIRMED",
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PREORDER_STATUS = {
  DEPOSITED: "DEPOSITED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type PreorderStatus = (typeof PREORDER_STATUS)[keyof typeof PREORDER_STATUS];

export const TASK_STATUS = {
  PENDING: "PENDING",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const EMPLOYEE_KIND = {
  ASSIGNER: "ASSIGNER",
  ASSIGNEE: "ASSIGNEE",
} as const;
export type EmployeeKind = (typeof EMPLOYEE_KIND)[keyof typeof EMPLOYEE_KIND];
