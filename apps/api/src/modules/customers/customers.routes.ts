import type { FastifyInstance } from "fastify";
import { PERMISSIONS, customerSchema, customerImportInputSchema, type CustomerInput } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { generateCustomerCode } from "../../lib/codes.js";
import { isAdminRole, isMasked, maskPhone } from "../../lib/mask-phone.js";
import { importCustomers } from "./customers.service.js";

function toDto(customer: { debtBalance: unknown; birthday: Date | null; [key: string]: unknown }, role?: string) {
  const hidePhones = !isAdminRole(role);
  return {
    ...customer,
    ...(hidePhones
      ? {
          phone: maskPhone(customer.phone as string | null),
          phone2: maskPhone(customer.phone2 as string | null),
        }
      : {}),
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
  // Used by the POS customer search field (F4) and the back-office customer list.
  // page/pageSize default to the old fixed take:50 behavior when omitted, so the
  // POS quick-search callers (which never pass them) are unaffected.
  app.get("/customers", { preHandler: authenticate }, async (request) => {
    const { search, page: pageRaw, pageSize: pageSizeRaw } = request.query as {
      search?: string;
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number(pageRaw ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? 50)));

    const where = {
      deletedAt: null,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }] }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return { data: customers.map((c) => toDto(c, request.authUser!.role)), meta: { total, page, pageSize } };
  });

  // Used both by the back-office "Thêm khách hàng" page and the POS "+" quick-add dialog
  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({
      data: { ...toPrismaData(input), code, createdById: request.authUser!.id },
    });
    return reply.code(201).send(toDto(customer, request.authUser!.role));
  });

  app.post(
    "/customers/import",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.CUSTOMERS_MANAGE)] },
    async (request) => {
      const input = customerImportInputSchema.parse(request.body);
      return importCustomers(input.rows, request.authUser!.id);
    },
  );

  app.get("/customers/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return reply.code(404).send({ message: "Không tìm thấy khách hàng" });

    const createdBy = customer.createdById
      ? await prisma.user.findUnique({ where: { id: customer.createdById }, select: { username: true } })
      : null;

    return { ...toDto(customer, request.authUser!.role), createdByName: createdBy?.username ?? null };
  });

  app.patch("/customers/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const input = customerSchema.partial().parse(request.body);
    // The edit form of a non-admin holds masked numbers; sending those back must not change the real ones.
    if (isMasked(input.phone)) delete input.phone;
    if (isMasked(input.phone2)) delete input.phone2;
    const customer = await prisma.customer.update({ where: { id }, data: toPrismaData(input) });
    return toDto(customer, request.authUser!.role);
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
