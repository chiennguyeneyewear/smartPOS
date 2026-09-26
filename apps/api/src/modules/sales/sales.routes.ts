import type { FastifyInstance } from "fastify";
import { PERMISSIONS, ROLES, saveInvoiceSchema, checkoutInvoiceSchema } from "@smartpos/shared";
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

  app.get("/sales/invoices", { preHandler: [authenticate, branchScope] }, async (request) => {
    const query = request.query as {
      branchId?: string;
      status?: string;
      customerId?: string;
      createdById?: string;
      from?: string;
      to?: string;
    };
    // Admin sees every invoice and may filter by seller. Everyone else only ever sees the invoices
    // they created themselves, whatever branch or seller the request asks for.
    const isAdmin = request.authUser!.role === ROLES.ADMIN;
    const data = await salesService.listInvoices(
      isAdmin ? query : { ...query, branchId: undefined, createdById: request.authUser!.id },
    );
    return { data };
  });
}
