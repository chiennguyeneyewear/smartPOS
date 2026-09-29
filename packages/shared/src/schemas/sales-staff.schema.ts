import { z } from "zod";

export const salesStaffSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên nhân viên").max(80),
});
export type SalesStaffInput = z.infer<typeof salesStaffSchema>;
