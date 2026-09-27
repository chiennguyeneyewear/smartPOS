import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { PERMISSIONS, customerSchema, customerImportInputSchema, type CustomerInput } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { generateCustomerCode } from "../../lib/codes.js";
import { importCustomers } from "./customers.service.js";

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
  // Used by the POS customer search field (F4) and the back-office customer list.
  // page/pageSize default to the old fixed take:50 behavior when omitted, so the
  // POS quick-search callers (which never pass them) are unaffected.
  app.get("/customers", { preHandler: authenticate }, async (request) => {
    const { search, page: pageRaw, pageSize: pageSizeRaw, sortBy, sortDir } = request.query as {
      search?: string;
      page?: string;
      pageSize?: string;
      sortBy?: string;
      sortDir?: string;
    };
    // Only these columns can be sorted on (clicking a column header in the customer list); default is by name.
    const sortable = ["code", "name", "phone", "address", "groupName", "debtBalance"] as const;
    const column = (sortable as readonly string[]).includes(sortBy ?? "") ? (sortBy as (typeof sortable)[number]) : "name";
    const direction = sortDir === "desc" ? "desc" : "asc";
    const page = Math.max(1, Number(pageRaw ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? 50)));

    const where = {
      deletedAt: null,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }] }
        : {}),
    };

    // Codes sort by their number (KH000009 before KH000010, then KH990961), with odd imported codes such as
    // "KHTTS..." or "REG123" after the numbered ones, instead of a plain alphabetical order.
    async function pageByCodeNumber() {
      const like = search ? `%${search.replace(/[\\%_]/g, "\\    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ [column]: direction }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);
")}%` : null;
      const dir = direction === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
      const isNumbered = Prisma.sql`(code ~ '^KH[0-9]{1,9}
    return { data: customers.map(toDto), meta: { total, page, pageSize } };
  });

  // Used both by the back-office "Thêm khách hàng" page and the POS "+" quick-add dialog
  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({
      data: { ...toPrismaData(input), code, createdById: request.authUser!.id },
    });
    return reply.code(201).send(toDto(customer));
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

    return { ...toDto(customer), createdByName: createdBy?.username ?? null };
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
)`;
      const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM customers
        WHERE "deletedAt" IS NULL ${like ? Prisma.sql`AND (name ILIKE ${like} OR phone LIKE ${like})` : Prisma.empty}
        ORDER BY ${isNumbered} DESC,
                 CASE WHEN code ~ '^KH[0-9]{1,9}
    return { data: customers.map(toDto), meta: { total, page, pageSize } };
  });

  // Used both by the back-office "Thêm khách hàng" page and the POS "+" quick-add dialog
  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({
      data: { ...toPrismaData(input), code, createdById: request.authUser!.id },
    });
    return reply.code(201).send(toDto(customer));
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

    return { ...toDto(customer), createdByName: createdBy?.username ?? null };
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
 THEN CAST(SUBSTRING(code FROM 3) AS BIGINT) END ${dir},
                 code ${dir}
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
      const rows = await prisma.customer.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((r) => byId.get(r.id)!).filter(Boolean);
    }

    const [customers, total] = await Promise.all([
      column === "code"
        ? pageByCodeNumber()
        : prisma.customer.findMany({
            where,
            orderBy: [{ [column]: direction }, { id: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
      prisma.customer.count({ where }),
    ]);

    return { data: customers.map(toDto), meta: { total, page, pageSize } };
  });

  // Used both by the back-office "Thêm khách hàng" page and the POS "+" quick-add dialog
  app.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const input = customerSchema.parse(request.body);
    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({
      data: { ...toPrismaData(input), code, createdById: request.authUser!.id },
    });
    return reply.code(201).send(toDto(customer));
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

    return { ...toDto(customer), createdByName: createdBy?.username ?? null };
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
