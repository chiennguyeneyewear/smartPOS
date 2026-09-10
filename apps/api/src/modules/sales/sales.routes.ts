import type { FastifyInstance } from "fastify";
import { PERMISSIONS, saveInvoiceSchema, checkoutInvoiceSchema } from "@smartpos/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { branchScope } from "../../middleware/branch-scope.js";
import * as salesService from "./sales.service.js";

export function registerSalesRoutes(app: FastifyInstance) {
  app.post(
    "/sales/invoices",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)] },
    async (request, reply) => {
      const input = saveInvoiceSchema.parse(request.body);
      const invoice = await salesService.createDraftInvoice(input, request.authUser!.id);
      return reply.code(201).send(invoice);
    },
  );

  app.patch(
    "/sales/invoices/:id",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = saveInvoiceSchema.parse(request.body);
      return salesService.updateDraftInvoice(id, input);
    },
  );

  app.post(
    "/sales/invoices/:id/checkout",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = checkoutInvoiceSchema.parse(request.body);
      return salesService.checkoutInvoice(id, input, request.authUser!.id);
    },
  );

  app.post(
    "/sales/invoices/:id/void",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_VOID)] },
    async (request) => {
      const { id } = request.params as { id: string };
      return salesService.voidInvoice(id, request.authUser!.id);
    },
  );

  app.post(
    "/sales/invoices/void-bulk",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_VOID)] },
    async (request, reply) => {
      const { ids } = request.body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ message: "Danh sách hóa đơn cần hủy không hợp lệ" });
      }
      await salesService.voidInvoices(ids, request.authUser!.id);
      return reply.code(204).send();
    },
  );

  // TEMPORARY: lets a seeding script spread demo invoices' dates across a
  // window instead of every one landing at "now". Admin-gated + requires an
  // explicit confirm token. Remove once used — not meant to ship.
  app.patch(
    "/sales/invoices/:id/backdate",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_VOID)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { date?: string; confirm?: string };
      if (body.confirm !== "BACKDATE_SEED" || !body.date) {
        return { error: "Thiếu xác nhận hoặc ngày" };
      }
      return salesService.backdateInvoice(id, new Date(body.date));
    },
  );

  app.get("/sales/invoices", { preHandler: [authenticate, branchScope] }, async (request) => {
    const query = request.query as {
      branchId?: string;
      status?: string;
      customerId?: string;
      createdById?: string;
      from?: string;
      to?: string;
    };
    const data = await salesService.listInvoices(query);
    return { data };
  });
}
