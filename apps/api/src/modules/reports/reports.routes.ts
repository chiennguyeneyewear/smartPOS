import type { FastifyInstance } from "fastify";
import { PERMISSIONS, ROLES } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { branchScope } from "../../middleware/branch-scope.js";
import * as reportsService from "./reports.service.js";

export function registerReportRoutes(app: FastifyInstance) {
  // branchScope resolves & authorizes the requested branch: a manager can only
  // ever see the branch(es) they were assigned in Nhân viên > Chi nhánh được phép truy cập.
  const guard = [authenticate, requirePermission(PERMISSIONS.REPORTS_VIEW), branchScope];

  app.get("/reports/revenue", { preHandler: guard }, async (request) => {
    const query = request.query as {
      branchId?: string;
      from?: string;
      to?: string;
      groupBy?: "day" | "week" | "month" | "hour" | "weekday";
    };
    const data = await reportsService.getRevenueOverTime(query, query.groupBy ?? "day");
    return { data };
  });

  app.get("/reports/dashboard-summary", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    return reportsService.getDashboardSummary(query.branchId, query.from ?? todayStart, query.to ?? todayEnd);
  });

  app.get("/reports/top-products", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string; limit?: string };
    const data = await reportsService.getTopProducts(query, Number(query.limit ?? 10));
    return { data };
  });

  app.get("/reports/top-customers", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string; limit?: string };
    const data = await reportsService.getTopCustomers(query, Number(query.limit ?? 10));
    return { data };
  });

  app.get("/reports/stock-value", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string };
    return reportsService.getStockValue(query.branchId);
  });

  app.get(
    "/reports/branch-comparison",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.REPORTS_VIEW)] },
    async (request) => {
      const query = request.query as { from?: string; to?: string };
      // Not gated through branchScope (it compares across branches by design) — instead,
      // a non-admin only ever sees the branches they're assigned to, admins see all.
      const allowedBranchIds = request.authUser!.role === ROLES.ADMIN ? undefined : request.authUser!.branchIds;
      const data = await reportsService.getBranchComparison(query, allowedBranchIds);
      return { data };
    },
  );

  app.get("/reports/end-of-day", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; date?: string };
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    return reportsService.getEndOfDay(date, query.branchId);
  });

  app.get("/reports/profit", { preHandler: guard }, async (request) => {
    const query = request.query as { branchId?: string; from?: string; to?: string };
    return reportsService.getProfit(query);
  });
}
