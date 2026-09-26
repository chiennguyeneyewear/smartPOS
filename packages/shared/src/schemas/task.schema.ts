import { z } from "zod";
import { EMPLOYEE_KIND, TASK_STATUS } from "../constants/enums.js";

export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Nhập tên công việc").max(200, "Tên công việc tối đa 200 ký tự"),
    description: z.string().trim().max(5000, "Nội dung tối đa 5000 ký tự").default(""),
    assignerId: z.string().min(1, "Chọn người giao việc"),
    assigneeId: z.string().min(1, "Chọn người nhận việc"),
    branchId: z.string().min(1, "Chọn chi nhánh"),
    dueAt: z
      .string()
      .nullable()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Thời hạn hoàn thành không hợp lệ"),
  });
export type TaskInput = z.infer<typeof taskSchema>;

export const updateTaskSchema = taskSchema.partial().extend({
  status: z.nativeEnum(TASK_STATUS).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskBranchSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên chi nhánh").max(100, "Tên chi nhánh tối đa 100 ký tự"),
});
export type TaskBranchInput = z.infer<typeof taskBranchSchema>;

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên").max(100, "Tên tối đa 100 ký tự"),
  kind: z.nativeEnum(EMPLOYEE_KIND),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
