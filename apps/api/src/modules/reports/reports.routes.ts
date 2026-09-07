import type { FastifyInstance } from "fastify";
import { PERMISSIONS } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import * as reportsService from "./reports.service.js";

export function registerReportRoutes(app: FastifyInstance) {
  const guard = [authenticate, requirePermission(PERMISSIONS.REPORTS_VIEW)];

  app.get("/reports/revenue", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string; groupBy?: "day" | "week" | "month" };
    const data = await reportsService.getRevenueOverTime(query, query.groupBy ?? "day");
    return { data };
  });

  app.get("/reports/top-products", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string; limit?: string };
    const data = await reportsService.getTopProducts(query, Number(query.limit ?? 10));
    return { data };
  });

  app.get("/reports/stock-value", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string };
    return reportsService.getStockValue(query.branchId);
  });

  app.get("/reports/branch-comparison", { preHandler: guard }, async (request) => {
    const query = request.query as { from?: string; to?: string };
    const data = await reportsService.getBranchComparison(query);
    return { data };
  });

  app.get("/reports/profit", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string };
    return reportsService.getProfit(query);
  });
}
