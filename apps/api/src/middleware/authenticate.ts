import type { FastifyReply, FastifyRequest } from "fastify";
import { getSessionState, sessionStillValid } from "../lib/session-state.js";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user;
    if (!sessionStillValid(payload, payload.role, await getSessionState())) {
      return reply.code(401).send({
        error: "SessionExpired",
        message: "Phiên đăng nhập đã kết thúc do hệ thống vừa cập nhật, vui lòng đăng nhập lại",
      });
    }
    request.authUser = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
      branchIds: payload.branchIds,
    };
  } catch {
    return reply.code(401).send({ error: "Unauthorized", message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}
