import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user;
    request.authUser = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      permissions: payload.permissions,
      branchIds: payload.branchIds,
    };
  } catch {
    return reply.code(401).send({ error: "Unauthorized", message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}
