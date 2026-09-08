import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { prisma } from "../../lib/prisma.js";
import { resolveMenuAccess } from "../../lib/menu-access.js";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function registerUserRoutes(app: FastifyInstance) {
  app.get(
    "/users",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async () => {
      const users = await prisma.user.findMany({
        include: { role: true, branches: { include: { branch: true } } },
        orderBy: { username: "asc" },
      });
      return {
        data: users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          phone: u.phone,
          isActive: u.isActive,
          role: u.role.name,
          roleId: u.roleId,
          branches: u.branches.map((b) => ({ id: b.branch.id, name: b.branch.name, code: b.branch.code })),
          defaultBranchId: u.defaultBranchId,
          menuAccess: resolveMenuAccess(u.menuAccess, u.role.name),
        })),
      };
    },
  );

  app.post(
    "/users",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const body = request.body as {
        username: string;
        password: string;
        phone?: string;
        roleId: string;
        branchIds: string[];
        defaultBranchId?: string;
        menuAccess?: string[];
      };
      const passwordHash = await argon2.hash(body.password);
      try {
        const user = await prisma.user.create({
          data: {
            username: body.username,
            passwordHash,
            phone: body.phone,
            roleId: body.roleId,
            defaultBranchId: body.defaultBranchId ?? body.branchIds[0],
            branches: { create: body.branchIds.map((branchId) => ({ branchId })) },
            menuAccess: body.menuAccess ?? [],
          },
        });
        return reply.code(201).send({ id: user.id, username: user.username });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return reply.code(409).send({ error: "Conflict", message: "Tên đăng nhập đã tồn tại" });
        }
        throw error;
      }
    },
  );

  app.patch(
    "/users/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<{
        username: string;
        phone: string;
        isActive: boolean;
        roleId: string;
        defaultBranchId: string;
        menuAccess: string[];
        password: string;
      }>;
      const { password, ...rest } = body;
      try {
        return await prisma.user.update({
          where: { id },
          data: { ...rest, ...(password ? { passwordHash: await argon2.hash(password) } : {}) },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return reply.code(409).send({ error: "Conflict", message: "Tên đăng nhập đã tồn tại" });
        }
        throw error;
      }
    },
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === request.authUser!.id) {
        return reply.code(400).send({ error: "BadRequest", message: "Không thể xóa chính tài khoản đang đăng nhập" });
      }
      await prisma.user.delete({ where: { id } });
      return reply.code(204).send();
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
