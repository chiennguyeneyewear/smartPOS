import type { FastifyInstance } from "fastify";
import { PERMISSIONS, ROLES, saveInvoiceSchema, checkoutInvoiceSchema, confirmPaymentSchema } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import * as salesService from "./sales.service.js";

// Staff can only touch invoices they created themselves; the admin can touch any.
async function assertOwnsInvoice(id: string, user: { id: string; role: string }) {
  if (user.role === ROLES.ADMIN) return;
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { createdById: true } });
  if (invoice && invoice.createdById !== user.id) {
    throw new salesService.SalesError("Bạn chỉ được thao tác trên hóa đơn của chính mình", 403);
  }
}

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
      await assertOwnsInvoice(id, request.authUser!);
      return salesService.updateDraftInvoice(id, input);
    },
  );

  app.post(
    "/sales/invoices/:id/checkout",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = checkoutInvoiceSchema.parse(request.body);
      await assertOwnsInvoice(id, request.authUser!);
      return salesService.checkoutInvoice(id, input, request.authUser!.id);
    },
  );

  // Confirms (or corrects) how an invoice was paid, e.g. after a one-tap invoice.
  app.post(
    "/sales/invoices/:id/confirm-payment",
    { preHandler: [authenticate, requirePermission(PERMISSIONS.SALES_CREATE)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = confirmPaymentSchema.parse(request.body);
      return salesService.confirmInvoicePayment(id, input, request.authUser!);
    },
  );

  app.post(
    "/sales/invoices/:id/void",
    { preHandler: [authenticate, requireAdmin] },
    async (request) => {
      const { id } = request.params as { id: string };
      return salesService.voidInvoice(id, request.authUser!.id);
    },
  );

  app.post(
    "/sales/invoices/void-bulk",
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { ids } = request.body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({ message: "Danh sách hóa đơn cần hủy không hợp lệ" });
      }
      await salesService.voidInvoices(ids, request.authUser!.id);
      return reply.code(204).send();
    },
  );

  // No branchScope: access is decided by who created the invoice, not by the branch header, so a stale
  // or foreign X-Branch-Id can no longer turn a seller's own list into a 403/empty page.
  app.get("/sales/invoices", { preHandler: [authenticate] }, async (request) => {
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
