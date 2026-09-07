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
