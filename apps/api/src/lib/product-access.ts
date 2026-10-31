import type { FastifyReply, FastifyRequest } from "fastify";
import { PERMISSIONS, ROLES } from "@smartpos/shared";
import type { AuthUser } from "../types/fastify.js";

// Full control of the catalogue (edit, delete, cost prices, stock value): admin, manager, warehouse.
// A cashier (CS1/CS2/CS3) only browses products and creates new ones, so cost figures stay hidden.
export function canManageProducts(user: AuthUser): boolean {
  return user.permissions.includes(PERMISSIONS.PRODUCTS_MANAGE);
}

export async function requireProductCreate(request: FastifyRequest, reply: FastifyReply) {
  const user = request.authUser;
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  if (canManageProducts(user) || user.role === ROLES.CASHIER) return;
  return reply.code(403).send({
    error: "Forbidden",
    message: `Bạn không có quyền thực hiện thao tác này (${PERMISSIONS.PRODUCTS_MANAGE})`,
  });
}
