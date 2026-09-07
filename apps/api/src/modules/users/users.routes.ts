import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { PERMISSIONS } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";

export function registerUserRoutes(app: FastifyInstance) {
  app.get(
    "/users",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async () => {
      const users = await prisma.user.findMany({
        include: { role: true, branches: { include: { branch: true } } },
        orderBy: { fullName: "asc" },
      });
      return {
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          isActive: u.isActive,
          role: u.role.name,
          branches: u.branches.map((b) => ({ id: b.branch.id, name: b.branch.name, code: b.branch.code })),
          defaultBranchId: u.defaultBranchId,
        })),
      };
    },
  );

  app.post(
    "/users",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const body = request.body as {
        email: string;
        password: string;
        fullName: string;
        phone?: string;
        roleId: string;
        branchIds: string[];
        defaultBranchId?: string;
      };
      const passwordHash = await argon2.hash(body.password);
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          fullName: body.fullName,
          phone: body.phone,
          roleId: body.roleId,
          defaultBranchId: body.defaultBranchId ?? body.branchIds[0],
          branches: { create: body.branchIds.map((branchId) => ({ branchId })) },
        },
      });
      return reply.code(201).send({ id: user.id, email: user.email });
    },
  );

  app.patch(
    "/users/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<{
        fullName: string;
        phone: string;
        isActive: boolean;
        roleId: string;
        defaultBranchId: string;
      }>;
      return prisma.user.update({ where: { id }, data: body });
    },
  );

  app.patch(
    "/users/:id/branches",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { branchIds } = request.body as { branchIds: string[] };
      await prisma.$transaction([
        prisma.userBranch.deleteMany({ where: { userId: id } }),
        prisma.userBranch.createMany({ data: branchIds.map((branchId) => ({ userId: id, branchId })) }),
      ]);
      return { success: true };
    },
  );

  app.get("/roles", { preHandler: authenticate }, async () => {
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    return { data: roles };
  });
}
