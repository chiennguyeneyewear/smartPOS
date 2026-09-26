import { z } from "zod";
import { PAYMENT_METHOD } from "../constants/enums.js";

export const preorderCreateSchema = z.object({
  branchId: z.string(),
  customerId: z.string().min(1, "Đơn đặt cọc phải có khách hàng"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().positive("Số lượng phải > 0"),
        unitPrice: z.coerce.number().min(0),
      }),
    )
    .min(1, "Đơn phải có ít nhất 1 sản phẩm"),
  depositAmount: z.coerce.number().positive("Số tiền cọc phải > 0"),
  prescription: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});
export type PreorderCreateInput = z.infer<typeof preorderCreateSchema>;

export const preorderDepositConfirmSchema = z.object({
  method: z.enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.BANK_TRANSFER, PAYMENT_METHOD.CARD]),
  reference: z.string().trim().max(200).optional().nullable(),
});
export type PreorderDepositConfirmInput = z.infer<typeof preorderDepositConfirmSchema>;

// Discount is only ever entered here, when the pre-order becomes an invoice.
export const preorderDeliverSchema = z.object({
  branchId: z.string(),
  discountAmount: z.coerce.number().min(0).default(0),
});
export type PreorderDeliverInput = z.infer<typeof preorderDeliverSchema>;

export const preorderCancelSchema = z.object({
  reason: z.string().trim().min(1, "Phải ghi lý do hủy"),
  refundAmount: z.coerce.number().min(0).default(0),
});
export type PreorderCancelInput = z.infer<typeof preorderCancelSchema>;
