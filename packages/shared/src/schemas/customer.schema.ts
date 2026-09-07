import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Tên khách hàng không được để trống"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

// Used by the "+" quick-add button on the POS customer search field
export const quickCustomerSchema = z.object({
  name: z.string().min(1, "Tên khách hàng không được để trống"),
  phone: z.string().min(1, "Số điện thoại không được để trống"),
});
export type QuickCustomerInput = z.infer<typeof quickCustomerSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
