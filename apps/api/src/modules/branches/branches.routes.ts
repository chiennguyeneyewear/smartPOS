import type { FastifyInstance } from "fastify";
import { PERMISSIONS } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";

export function registerBranchRoutes(app: FastifyInstance) {
  app.get("/branches", { preHandler: authenticate }, async (request) => {
    const isAdmin = request.authUser!.role === "admin";
    const branches = await prisma.branch.findMany({
      where: isAdmin ? {} : { id: { in: request.authUser!.branchIds } },
      orderBy: { name: "asc" },
    });
    return { data: branches };
  });

  app.post(
    "/branches",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.BRANCHES_MANAGE)] },
    async (request, reply) => {
      const body = request.body as { name: string; code: string; address?: string; phone?: string };
      const branch = await prisma.branch.create({ data: body });
      return reply.code(201).send(branch);
    },
  );

  app.patch(
    "/branches/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.BRANCHES_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<{ name: string; address: string; phone: string; isActive: boolean }>;
      return prisma.branch.update({ where: { id }, data: body });
    },
  );
}
