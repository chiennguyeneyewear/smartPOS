import type { FastifyReply, FastifyRequest } from "fastify";
import type { PermissionName } from "@smartpos/shared";

export function requirePermission(permission: PermissionName) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.authUser) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (!request.authUser.permissions.includes(permission)) {
      return reply.code(403).send({
        error: "Forbidden",
        message: `Bạn không có quyền thực hiện thao tác này (${permission})`,
      });
    }
  };
}
