import type { FastifyInstance } from "fastify";
import { PERMISSIONS, createStockMovementSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { branchScope } from "../../middleware/branch-scope.js";
import { canManageProducts } from "../../lib/product-access.js";
import * as inventoryService from "./inventory.service.js";

export function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory/stock", { preHandler: [authenticate, branchScope] }, async (request) => {
    const query = request.query as { branchId: string; lowStock?: string; search?: string };
    const data = await inventoryService.getStock(query.branchId, {
      lowStock: query.lowStock === "true",
      search: query.search,
    });
    if (canManageProducts(request.authUser!)) return { data };
    return { data: data.map((row) => ({ ...row, product: { ...row.product, costPrice: 0 } })) };
  });

  app.post(
    "/inventory/movements",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.INVENTORY_ADJUST), branchScope] },
    async (request, reply) => {
      const input = createStockMovementSchema.parse(request.body);
      const movement = await inventoryService.createStockMovement(input, request.authUser!.id);
      return reply.code(201).send(movement);
    },
  );

  app.get("/inventory/movements", { preHandler: [authenticate, branchScope] }, async (request) => {
    const query = request.query as { branchId?: string; type?: string };
    const data = await inventoryService.listMovements(query);
    if (canManageProducts(request.authUser!)) return { data };
    return {
      data: data.map((movement) => ({
        ...movement,
        lines: movement.lines.map((line) => ({
          ...line,
          unitCost: null,
          product: { ...line.product, costPrice: 0 },
        })),
      })),
    };
  });
}
