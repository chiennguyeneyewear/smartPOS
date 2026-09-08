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

export const supplierSchema = z.object({
  name: z.string().min(1, "Tên nhà cung cấp không được để trống"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
