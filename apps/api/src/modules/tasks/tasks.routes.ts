import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { ROLES, TASK_STATUS, taskSchema, updateTaskSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";

const taskInclude = {
  assigner: { select: { id: true, username: true } },
  assignee: { select: { id: true, username: true } },
} satisfies Prisma.TaskInclude;

type TaskWithUsers = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function toDto(task: TaskWithUsers) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignerId: task.assignerId,
    assignerName: task.assigner.username,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee.username,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

async function activeUserExists(id: string) {
  const user = await prisma.user.findFirst({ where: { id, isActive: true }, select: { id: true } });
  return !!user;
}

export function registerTaskRoutes(app: FastifyInstance) {
  // Anyone signed in can be given work, so the picker can't reuse /users (admin-only).
  app.get("/tasks/assignees", { preHandler: authenticate }, async () => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    });
    return { data: users };
  });

  // Admins see every task; everyone else sees the tasks they gave or received.
  app.get("/tasks", { preHandler: authenticate }, async (request) => {
    const me = request.authUser!;
    const query = request.query as { status?: string; assigneeId?: string; from?: string; to?: string };
    const isAdmin = me.role === ROLES.ADMIN;

    const tasks = await prisma.task.findMany({
      where: {
        ...(isAdmin ? {} : { OR: [{ assignerId: me.id }, { assigneeId: me.id }] }),
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
    if (!(await activeUserExists(input.assigneeId))) {
      return reply.code(400).send({ message: "Người nhận việc không tồn tại hoặc đã ngừng hoạt động" });
    }
    const task = await prisma.task.create({
      data: { ...input, assignerId: request.authUser!.id },
      include: taskInclude,
    });
    return reply.code(201).send(toDto(task));
  });

  // The assigner (and admins) can edit anything; the assignee can only move the status.
  app.patch("/tasks/:id", { preHandler: authenticate }, async (request, reply) => {
    const me = request.authUser!;
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy công việc" });

    const canEdit = me.role === ROLES.ADMIN || existing.assignerId === me.id;
    const canChangeStatus = canEdit || existing.assigneeId === me.id;
    const { status, ...fields } = input;
    const editsFields = Object.values(fields).some((v) => v !== undefined);

    if ((editsFields && !canEdit) || (status !== undefined && !canChangeStatus)) {
      return reply.code(403).send({ message: "Bạn không có quyền sửa công việc này" });
    }
    if (fields.assigneeId && !(await activeUserExists(fields.assigneeId))) {
      return reply.code(400).send({ message: "Người nhận việc không tồn tại hoặc đã ngừng hoạt động" });
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
    const me = request.authUser!;
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy công việc" });
    if (me.role !== ROLES.ADMIN && existing.assignerId !== me.id) {
      return reply.code(403).send({ message: "Chỉ người giao việc mới được xóa công việc" });
    }
    await prisma.task.delete({ where: { id } });
    return { success: true };
  });
}
