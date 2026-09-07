import { z } from "zod";
import { PAYMENT_METHOD, SALE_MODE } from "../constants/enums.js";

export const invoiceItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().positive("Số lượng phải > 0"),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const saveInvoiceSchema = z.object({
  branchId: z.string(),
  customerId: z.string().optional().nullable(),
  saleMode: z.nativeEnum(SALE_MODE).default(SALE_MODE.NORMAL),
  note: z.string().optional().nullable(),
  discountAmount: z.coerce.number().min(0).default(0),
  items: z.array(invoiceItemInputSchema).min(1, "Hóa đơn phải có ít nhất 1 sản phẩm"),
});
export type SaveInvoiceInput = z.infer<typeof saveInvoiceSchema>;

export const paymentInputSchema = z.object({
  method: z.nativeEnum(PAYMENT_METHOD),
  amount: z.coerce.number().positive("Số tiền phải > 0"),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const checkoutInvoiceSchema = z.object({
  payments: z.array(paymentInputSchema).min(1, "Phải có ít nhất 1 phương thức thanh toán"),
});
export type CheckoutInvoiceInput = z.infer<typeof checkoutInvoiceSchema>;
