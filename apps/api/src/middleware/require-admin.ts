import type { FastifyReply, FastifyRequest } from "fastify";
import { ROLES } from "@smartpos/shared";

// For actions only the admin account may perform, whatever permissions a role happens to carry.
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
  if (request.authUser.role !== ROLES.ADMIN) {
    return reply.code(403).send({ error: "Forbidden", message: "Chỉ admin mới được thực hiện thao tác này" });
  }
}
