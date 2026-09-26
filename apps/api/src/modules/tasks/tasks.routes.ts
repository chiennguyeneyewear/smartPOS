import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import {
  EMPLOYEE_KIND,
  TASK_STATUS,
  employeeSchema,
  taskBranchSchema,
  taskSchema,
  updateTaskSchema,
} from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";

const taskInclude = {
  assigner: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
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
    branchId: task.branchId,
    branchName: task.branch?.name ?? null,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

// Each side of a task must come from its own list (givers vs receivers), and still be active.
async function staffAreValid(staff: { assignerId?: string; assigneeId?: string }) {
  const checks: Promise<number>[] = [];
  if (staff.assignerId) {
    checks.push(prisma.employee.count({ where: { id: staff.assignerId, kind: EMPLOYEE_KIND.ASSIGNER, deletedAt: null } }));
  }
  if (staff.assigneeId) {
    checks.push(prisma.employee.count({ where: { id: staff.assigneeId, kind: EMPLOYEE_KIND.ASSIGNEE, deletedAt: null } }));
  }
  return (await Promise.all(checks)).every((n) => n === 1);
}

async function branchExists(id: string) {
  return (await prisma.taskBranch.count({ where: { id, deletedAt: null } })) === 1;
}

const MISSING_BRANCH_MESSAGE = "Chi nhánh không tồn tại";
const MISSING_STAFF_MESSAGE = "Người giao hoặc người nhận việc không hợp lệ (có thể đã bị xóa khỏi danh sách)";

// People who give work and people who receive it are two separate lists (not the shared login
// accounts), managed right from the task screen; every signed-in user can maintain them.
export function registerEmployeeRoutes(app: FastifyInstance) {
  app.get("/employees", { preHandler: authenticate }, async (request) => {
    const { kind } = request.query as { kind?: string };
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...(kind === EMPLOYEE_KIND.ASSIGNER || kind === EMPLOYEE_KIND.ASSIGNEE ? { kind } : {}),
      },
      select: { id: true, name: true, kind: true },
      orderBy: { name: "asc" },
    });
    return { data: employees };
  });

  app.post("/employees", { preHandler: authenticate }, async (request, reply) => {
    const { name, kind } = employeeSchema.parse(request.body);
    const duplicate = await prisma.employee.findFirst({
      where: { deletedAt: null, kind, name: { equals: name, mode: "insensitive" } },
    });
    if (duplicate) return reply.code(409).send({ message: "Tên này đã có trong danh sách" });
    const employee = await prisma.employee.create({ data: { name, kind }, select: { id: true, name: true, kind: true } });
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

// Branch labels used only by tasks; every signed-in user can maintain the list.
export function registerTaskBranchRoutes(app: FastifyInstance) {
  app.get("/task-branches", { preHandler: authenticate }, async () => {
    const branches = await prisma.taskBranch.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { data: branches };
  });

  app.post("/task-branches", { preHandler: authenticate }, async (request, reply) => {
    const { name } = taskBranchSchema.parse(request.body);
    const duplicate = await prisma.taskBranch.findFirst({
      where: { deletedAt: null, name: { equals: name, mode: "insensitive" } },
    });
    if (duplicate) return reply.code(409).send({ message: "Chi nhánh này đã có trong danh sách" });
    const branch = await prisma.taskBranch.create({ data: { name }, select: { id: true, name: true } });
    return reply.code(201).send(branch);
  });

  // Soft delete: tasks already tagged with this branch keep its name.
  app.delete("/task-branches/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.taskBranch.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy chi nhánh" });
    await prisma.taskBranch.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  });
}

export function registerTaskRoutes(app: FastifyInstance) {
  app.get("/tasks", { preHandler: authenticate }, async (request) => {
    const query = request.query as {
      status?: string;
      assigneeId?: string;
      branchId?: string;
      from?: string;
      to?: string;
    };

    const tasks = await prisma.task.findMany({
      where: {
        ...(query.status === TASK_STATUS.PENDING || query.status === TASK_STATUS.DONE
          ? { status: query.status }
          : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
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
    if (!(await staffAreValid(input))) {
      return reply.code(400).send({ message: MISSING_STAFF_MESSAGE });
    }
    if (!(await branchExists(input.branchId))) {
      return reply.code(400).send({ message: MISSING_BRANCH_MESSAGE });
    }
    const { dueAt, ...rest } = input;
    const task = await prisma.task.create({
      data: { ...rest, dueAt: dueAt ? new Date(dueAt) : null },
      include: taskInclude,
    });
    return reply.code(201).send(toDto(task));
  });

  app.patch("/tasks/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, dueAt, ...fields } = updateTaskSchema.parse(request.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: "Không tìm thấy công việc" });

    // Only re-validate people that are actually being changed, so a task whose original
    // assigner was later removed from the list can still be marked done.
    const changedStaff = {
      assignerId: fields.assignerId && fields.assignerId !== existing.assignerId ? fields.assignerId : undefined,
      assigneeId: fields.assigneeId && fields.assigneeId !== existing.assigneeId ? fields.assigneeId : undefined,
    };
    if (!(await staffAreValid(changedStaff))) {
      return reply.code(400).send({ message: MISSING_STAFF_MESSAGE });
    }

    if (fields.branchId && fields.branchId !== existing.branchId && !(await branchExists(fields.branchId))) {
      return reply.code(400).send({ message: MISSING_BRANCH_MESSAGE });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...fields,
        ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
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
