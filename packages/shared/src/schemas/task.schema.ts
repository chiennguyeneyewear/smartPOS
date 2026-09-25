import { z } from "zod";
import { TASK_STATUS } from "../constants/enums.js";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên công việc").max(200, "Tên công việc tối đa 200 ký tự"),
  description: z.string().trim().max(5000, "Nội dung tối đa 5000 ký tự").default(""),
  assigneeId: z.string().min(1, "Chọn người nhận việc"),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const updateTaskSchema = taskSchema.partial().extend({
  status: z.nativeEnum(TASK_STATUS).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
