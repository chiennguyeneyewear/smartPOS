import type { FastifyInstance } from "fastify";
import { ROLES, expenseSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { assertRecentDay } from "../../lib/date-access.js";
import { prisma } from "../../lib/prisma.js";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDay = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

class ExpenseError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ExpenseError";
    this.statusCode = statusCode;
  }
}

function toDto(e: {
  id: string;
  date: string;
  branchId: string;
  amount: unknown;
  payer: string;
  content: string;
  createdById: string;
  createdByName: string;
  createdAt: Date;
  branch: { name: string };
}) {
  return { ...e, amount: Number(e.amount), branchName: e.branch.name, branch: undefined };
}

// Money paid out of the till. The admin sees and manages every branch; anyone else (when given the Chi tiêu
// menu) only the branches they belong to, and can change only what they entered themselves, on the same day.
export function registerExpenseRoutes(app: FastifyInstance) {
  const include = { branch: { select: { name: true } } } as const;

  app.get("/expenses", { preHandler: authenticate }, async (request, reply) => {
    const { date, branchIds } = request.query as { date?: string; branchIds?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ message: "Thiếu ngày (YYYY-MM-DD)" });
    const user = request.authUser!;
    assertRecentDay(date, user.role);
    const wanted = (branchIds ?? "").split(",").filter(Boolean);
    const allowed = user.role === ROLES.ADMIN ? wanted : wanted.length > 0 ? wanted.filter((b) => user.branchIds.includes(b)) : user.branchIds;
    const rows = await prisma.expense.findMany({
      where: {
        date,
        ...(user.role === ROLES.ADMIN && wanted.length === 0 ? {} : { branchId: { in: allowed } }),
      },
      include,
      orderBy: { createdAt: "asc" },
    });
    return { data: rows.map(toDto) };
  });

  // Names used before as "người chi", to autocomplete the field.
  app.get("/expenses/payers", { preHandler: authenticate }, async () => {
    const rows = await prisma.expense.findMany({
      distinct: ["payer"],
      select: { payer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { data: rows.map((r) => r.payer) };
  });

  app.post("/expenses", { preHandler: authenticate }, async (request, reply) => {
    const input = expenseSchema.parse(request.body);
    const user = request.authUser!;
    assertRecentDay(input.date, user.role);
    if (user.role !== ROLES.ADMIN && !user.branchIds.includes(input.branchId)) {
      throw new ExpenseError("Bạn không thuộc cơ sở này", 403);
    }
    const created = await prisma.expense.create({
      data: { ...input, createdById: user.id, createdByName: user.username },
      include,
    });
    return reply.code(201).send(toDto(created));
  });

  async function loadOwned(id: string, user: { id: string; role: string }) {
    const expense = await prisma.expense.findUnique({ where: { id }, include });
    if (!expense) throw new ExpenseError("Không tìm thấy khoản chi", 404);
    const own = expense.createdById === user.id && vnDay(expense.createdAt) === vnDay(new Date());
    if (user.role !== ROLES.ADMIN && !own) {
      throw new ExpenseError("Chỉ admin được sửa hoặc xóa khoản chi của ngày trước", 403);
    }
    return expense;
  }

  app.patch("/expenses/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const input = expenseSchema.parse(request.body);
    const user = request.authUser!;
    await loadOwned(id, user);
    assertRecentDay(input.date, user.role);
    if (user.role !== ROLES.ADMIN && !user.branchIds.includes(input.branchId)) {
      throw new ExpenseError("Bạn không thuộc cơ sở này", 403);
    }
    return toDto(await prisma.expense.update({ where: { id }, data: input, include }));
  });

  app.delete("/expenses/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    await loadOwned(id, request.authUser!);
    await prisma.expense.delete({ where: { id } });
    return { success: true };
  });
}
