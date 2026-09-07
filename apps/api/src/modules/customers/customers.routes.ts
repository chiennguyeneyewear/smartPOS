import type { FastifyInstance } from "fastify";
import { PERMISSIONS, customerSchema, quickCustomerSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { generateCustomerCode } from "../../lib/codes.js";

function toDto(customer: { debtBalance: unknown; [key: string]: unknown }) {
  return { ...customer, debtBalance: Number(customer.debtBalance) };
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

  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({ data: { ...input, code } });
    return reply.code(201).send(toDto(customer));
  });

  // Quick-add: the "+" button next to the customer search box on the POS screen (name + phone only)
  app.post("/customers/quick", { preHandler: authenticate }, async (request, reply) => {
    const input = quickCustomerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({ data: { ...input, code } });
    return reply.code(201).send(toDto(customer));
  });

  app.patch("/customers/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const input = customerSchema.partial().parse(request.body);
    const customer = await prisma.customer.update({ where: { id }, data: input });
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
