import type { FastifyInstance } from "fastify";
import { PERMISSIONS, supplierSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { generateSupplierCode } from "../../lib/codes.js";

function toDto(supplier: { debtBalance: unknown; [key: string]: unknown }) {
  return { ...supplier, debtBalance: Number(supplier.debtBalance) };
}

export function registerSupplierRoutes(app: FastifyInstance) {
  app.get("/suppliers", { preHandler: authenticate }, async (request) => {
    const { search } = request.query as { search?: string };
    const suppliers = await prisma.supplier.findMany({
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
      take: 50,
    });
    return { data: suppliers.map(toDto) };
  });

  app.post(
    "/suppliers",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SUPPLIERS_MANAGE)] },
    async (request, reply) => {
      const input = supplierSchema.parse(request.body);
      const code = await generateSupplierCode();
      const supplier = await prisma.supplier.create({ data: { ...input, code } });
      return reply.code(201).send(toDto(supplier));
    },
  );

  app.patch(
    "/suppliers/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SUPPLIERS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = supplierSchema.partial().parse(request.body);
      const supplier = await prisma.supplier.update({ where: { id }, data: input });
      return toDto(supplier);
    },
  );

  app.delete(
    "/suppliers/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SUPPLIERS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
      return { success: true };
    },
  );
}
