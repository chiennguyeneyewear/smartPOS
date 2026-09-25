import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { TASK_STATUS, employeeSchema, taskSchema, updateTaskSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";

const taskInclude = {
  assigner: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

type TaskWithStaff = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function toDto(task: TaskWithStaff) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignerId: task.assignerId,
    assignerName: task.assigner.name,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee.name,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

async function allActiveEmployees(ids: string[]) {
  const found = await prisma.employee.count({ where: { id: { in: ids }, deletedAt: null } });
  return found === new Set(ids).size;
}

const MISSING_STAFF_MESSAGE = "Người giao hoặc người nhận việc không tồn tại (có thể đã bị xóa khỏi danh sách nhân viên)";

// Staff who give/receive work are their own list (not the shared login accounts), managed
// right from the task screen; every signed-in user can maintain it.
export function registerEmployeeRoutes(app: FastifyInstance) {
  app.get("/employees", { preHandler: authenticate }, async () => {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { data: employees };
  });

  app.post("/employees", { preHandler: authenticate }, async (request, reply) => {
    const { name } = employeeSchema.parse(request.body);
    const duplicate = await prisma.employee.findFirst({
      where: { deletedAt: null, name: { equals: name, mode: "insensitive" } },
    });
    if (duplicate) return reply.code(409).send({ message: "Nhân viên này đã có trong danh sách" });
    const employee = await prisma.employee.create({ data: { name }, select: { id: true, name: true } });
    return reply.code(201).send(employee);
  });

  // Soft delete: tasks already given to/by this person keep their name.
  app.delete("/employees/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy nhân viên" });
    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  });
}

export function registerTaskRoutes(app: FastifyInstance) {
  app.get("/tasks", { preHandler: authenticate }, async (request) => {
    const query = request.query as { status?: string; assigneeId?: string; from?: string; to?: string };

    const tasks = await prisma.task.findMany({
      where: {
        ...(query.status === TASK_STATUS.PENDING || query.status === TASK_STATUS.DONE
          ? { status: query.status }
          : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    return { data: tasks.map(toDto) };
  });

  app.post("/tasks", { preHandler: authenticate }, async (request, reply) => {
    const input = taskSchema.parse(request.body);
    if (!(await allActiveEmployees([input.assignerId, input.assigneeId]))) {
      return reply.code(400).send({ message: MISSING_STAFF_MESSAGE });
    }
    const task = await prisma.task.create({ data: input, include: taskInclude });
    return reply.code(201).send(toDto(task));
  });

  app.patch("/tasks/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, ...fields } = updateTaskSchema.parse(request.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy công việc" });

    // Only re-validate people that are actually being changed, so a task whose original
    // assigner was later removed from the list can still be marked done.
    const changedStaff = [
      fields.assignerId && fields.assignerId !== existing.assignerId ? fields.assignerId : null,
      fields.assigneeId && fields.assigneeId !== existing.assigneeId ? fields.assigneeId : null,
    ].filter((v): v is string => v !== null);
    if (changedStaff.length > 0 && !(await allActiveEmployees(changedStaff))) {
      return reply.code(400).send({ message: MISSING_STAFF_MESSAGE });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...fields,
        ...(status !== undefined && status !== existing.status
          ? { status, completedAt: status === TASK_STATUS.DONE ? new Date() : null }
          : {}),
      },
      include: taskInclude,
    });
    return toDto(task);
  });

  app.delete("/tasks/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy công việc" });
    await prisma.task.delete({ where: { id } });
    return { success: true };
  });
}
