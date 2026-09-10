import { z } from "zod";
import { GENDER } from "../constants/enums.js";

export const customerSchema = z.object({
  name: z.string().min(1, "Tên khách hàng không được để trống"),
  name2: z.string().optional().nullable(),
  phone: z.string().min(1, "Số điện thoại không được để trống"),
  phone2: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  groupName: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  gender: z.nativeEnum(GENDER).optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")).nullable(),
  facebook: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

// One row of a parsed KiotViet-style customer export (Mã khách hàng/Tên
// khách hàng/Điện thoại/Địa chỉ/.../Nợ cần thu hiện tại) — parsed client-side
// like the product import, so the backend just receives plain JSON rows.
export const customerImportRowSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1, "Thiếu tên khách hàng"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  groupName: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  gender: z.nativeEnum(GENDER).optional().nullable(),
  email: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  debtBalance: z.coerce.number().optional().nullable(),
});
export type CustomerImportRow = z.infer<typeof customerImportRowSchema>;

export const customerImportInputSchema = z.object({
  rows: z.array(customerImportRowSchema).min(1, "File không có dữ liệu"),
});
export type CustomerImportInput = z.infer<typeof customerImportInputSchema>;

export interface CustomerImportResult {
  created: number;
  updated: number;
  errors: { row: number; name: string; message: string }[];
}

export const supplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
