import type { FastifyInstance } from "fastify";
import { PERMISSIONS, createStockMovementSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import * as inventoryService from "./inventory.service.js";

export function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory/stock", { preHandler: authenticate }, async (request) => {
    const query = request.query as { branchId: string; lowStock?: string; search?: string };
    const data = await inventoryService.getStock(query.branchId, {
      lowStock: query.lowStock === "true",
      search: query.search,
    });
    return { data };
  });

  app.post(
    "/inventory/movements",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_ADJUST)] },
    async (request, reply) => {
      const input = createStockMovementSchema.parse(request.body);
      const movement = await inventoryService.createStockMovement(input, request.authUser!.id);
      return reply.code(201).send(movement);
    },
  );

  app.get("/inventory/movements", { preHandler: authenticate }, async (request) => {
    const query = request.query as { branchId?: string; type?: string };
    const data = await inventoryService.listMovements(query);
    return { data };
  });
}
