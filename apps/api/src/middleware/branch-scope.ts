import type { FastifyReply, FastifyRequest } from "fastify";
import { ROLES } from "@smartpos/shared";

function extractRequestedBranchId(request: FastifyRequest): string | undefined {
  const headerValue = request.headers["x-branch-id"];
  if (typeof headerValue === "string" && headerValue.length > 0) {
    return headerValue;
  }
  const query = request.query as Record<string, unknown> | undefined;
  if (query && typeof query.branchId === "string") {
    return query.branchId;
  }
  const body = request.body as Record<string, unknown> | undefined;
  if (body && typeof body.branchId === "string") {
    return body.branchId;
  }
  return undefined;
}

/**
 * Resolves the branch a request should operate on and verifies the
 * authenticated user actually has access to it. Admins may pass any branch
 * (including omitting one, to mean "all branches" for read endpoints).
 */
export async function branchScope(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const requestedBranchId = extractRequestedBranchId(request);
  const isAdmin = request.authUser.role === ROLES.ADMIN;

  if (!requestedBranchId) {
    if (isAdmin) {
      return; // admin querying across all branches
    }
    return reply.code(400).send({
      error: "BranchRequired",
      message: "Thiếu thông tin chi nhánh (branchId)",
    });
  }

  if (!isAdmin && !request.authUser.branchIds.includes(requestedBranchId)) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "Bạn không có quyền truy cập chi nhánh này",
    });
  }

  request.activeBranchId = requestedBranchId;
}
