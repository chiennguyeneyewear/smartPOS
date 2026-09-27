import { z } from "zod";

export const expenseSchema = z.object({
  // Vietnam-local day the money was spent
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  branchId: z.string().min(1, "Chọn cơ sở"),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0").max(1_000_000_000_000, "Số tiền quá lớn"),
  payer: z.string().trim().min(1, "Nhập người chi").max(80),
  content: z.string().trim().min(1, "Nhập nội dung chi").max(300),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
