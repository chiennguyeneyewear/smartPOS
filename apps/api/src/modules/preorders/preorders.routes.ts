import type { FastifyInstance } from "fastify";
import {
  PERMISSIONS,
  preorderCancelSchema,
  preorderCreateSchema,
  preorderDeliverSchema,
  preorderDepositConfirmSchema,
} from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { requirePermission } from "../../middleware/require-permission.js";
import * as preorders from "./preorders.service.js";

export function registerPreorderRoutes(app: FastifyInstance) {
  const actorOf = (request: { authUser?: { id: string; username: string; role: string } }) => request.authUser!;
  const canSell = [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)];

  app.get("/preorders", { preHandler: authenticate }, async (request) => {
    const { status } = request.query as { status?: string };
    return { data: await preorders.listPreorders({ status }, actorOf(request)) };
  });

  app.get("/preorders/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return preorders.getPreorder(id, actorOf(request));
  });

  app.post("/preorders", { preHandler: canSell }, async (request, reply) => {
    const input = preorderCreateSchema.parse(request.body);
    return reply.code(201).send(await preorders.createPreorder(input, actorOf(request)));
  });

  app.post("/preorders/:id/deposit-confirm", { preHandler: canSell }, async (request) => {
    const { id } = request.params as { id: string };
    const input = preorderDepositConfirmSchema.parse(request.body);
    return preorders.confirmDeposit(id, input, actorOf(request));
  });

  app.post("/preorders/:id/deliver", { preHandler: canSell }, async (request) => {
    const { id } = request.params as { id: string };
    const input = preorderDeliverSchema.parse(request.body);
    return preorders.deliverPreorder(id, input, actorOf(request));
  });

  app.post("/preorders/:id/cancel", { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = preorderCancelSchema.parse(request.body);
    return preorders.cancelPreorder(id, input, actorOf(request));
  });
}
