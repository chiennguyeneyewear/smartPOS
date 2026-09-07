import type { FastifyInstance } from "fastify";
import type { LoginInput } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "smartpos_refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const result = await authService.login(request.body as LoginInput);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: 60 * 60 * 24 * 7,
    });
    return { accessToken: result.accessToken, user: result.user };
  });

  app.post("/auth/refresh", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) {
      return reply.code(401).send({ error: "Unauthorized", message: "Thiếu refresh token" });
    }
    const result = await authService.refresh(token);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: 60 * 60 * 24 * 7,
    });
    return { accessToken: result.accessToken, user: result.user };
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { success: true };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    return authService.getCurrentUser(request.authUser!.id);
  });
}
