import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "Mã hàng không được để trống"),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1, "Tên sản phẩm không được để trống"),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  unitId: z.string().min(1, "Đơn vị tính không được để trống"),
  costPrice: z.coerce.number().min(0, "Giá vốn phải >= 0"),
  sellPrice: z.coerce.number().min(0, "Giá bán phải >= 0"),
  reorderThreshold: z.coerce.number().min(0).optional(),
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống"),
  parentId: z.string().optional().nullable(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const unitSchema = z.object({
  name: z.string().min(1, "Tên đơn vị tính không được để trống"),
});
export type UnitInput = z.infer<typeof unitSchema>;

// One row of a parsed KiotViet-style product export (Mã hàng/Tên hàng/Giá
// bán.../ĐVT...) — the frontend parses the .xlsx into this shape client-side
// so the backend never has to handle file uploads, just plain JSON rows.
export const productImportRowSchema = z.object({
  sku: z.string().min(1, "Thiếu mã hàng"),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1, "Thiếu tên hàng"),
  categoryName: z.string().optional().nullable(),
  unitName: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  stockQuantity: z.coerce.number().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});
export type ProductImportRow = z.infer<typeof productImportRowSchema>;

export const productImportInputSchema = z.object({
  branchId: z.string().optional(),
  rows: z.array(productImportRowSchema).min(1, "File không có dữ liệu"),
});
export type ProductImportInput = z.infer<typeof productImportInputSchema>;

export interface ProductImportResult {
  created: number;
  updated: number;
  errors: { row: number; sku: string; message: string }[];
}
