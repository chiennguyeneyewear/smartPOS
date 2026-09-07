import type { FastifyInstance } from "fastify";
import { PERMISSIONS, customerSchema, type CustomerInput } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { generateCustomerCode } from "../../lib/codes.js";

function toDto(customer: { debtBalance: unknown; birthday: Date | null; [key: string]: unknown }) {
  return {
    ...customer,
    debtBalance: Number(customer.debtBalance),
    birthday: customer.birthday ? customer.birthday.toISOString() : null,
  };
}

function toPrismaData<T extends Partial<CustomerInput>>(input: T) {
  const { birthday, ...rest } = input;
  return {
    ...rest,
    ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
  };
}

export function registerCustomerRoutes(app: FastifyInstance) {
  // Used by the POS customer search field (F4)
  app.get("/customers", { preHandler: authenticate }, async (request) => {
    const { search } = request.query as { search?: string };
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 50,
    });
    return { data: customers.map(toDto) };
  });

  // Used both by the back-office "Thêm khách hàng" page and the POS "+" quick-add dialog
  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({ data: { ...toPrismaData(input), code } });
    return reply.code(201).send(toDto(customer));
  });

  app.patch("/customers/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const input = customerSchema.partial().parse(request.body);
    const customer = await prisma.customer.update({ where: { id }, data: toPrismaData(input) });
    return toDto(customer);
  });

  app.get("/customers/:id/debt-history", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const data = await prisma.debtLedgerEntry.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    });
    return { data: data.map((e) => ({ ...e, amount: Number(e.amount) })) };
  });

  app.delete(
    "/customers/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
      return { success: true };
    },
  );
}
