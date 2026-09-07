import { z } from "zod";
import { STOCK_MOVEMENT_TYPES } from "../constants/enums.js";

export const stockMovementLineInputSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().positive("Số lượng phải > 0"),
  unitCost: z.coerce.number().min(0).optional(),
});
export type StockMovementLineInput = z.infer<typeof stockMovementLineInputSchema>;

export const createStockMovementSchema = z.object({
  type: z.nativeEnum(STOCK_MOVEMENT_TYPES),
  branchId: z.string(),
  fromBranchId: z.string().optional().nullable(),
  toBranchId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  lines: z.array(stockMovementLineInputSchema).min(1, "Phải có ít nhất 1 dòng hàng"),
});
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
