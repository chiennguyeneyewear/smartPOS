import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { clampFlatLineDiscount, type CheckoutInvoiceInput, type SaveInvoiceInput } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { generateInvoiceCode } from "../../lib/codes.js";

class SalesError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SalesError";
    this.statusCode = statusCode;
  }
}

// Defense in depth: re-clamp the discount server-side even though the POS
// client already clamps it, so a line's discount can never exceed its own
// value and drag down the rest of the invoice.
function computeLineTotal(item: { quantity: number; unitPrice: number; discount: number }) {
  const discount = clampFlatLineDiscount(item.discount, item.quantity, item.unitPrice);
  return item.quantity * item.unitPrice - discount;
}

function computeTotals(input: SaveInvoiceInput) {
  const subTotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const itemDiscounts = input.items.reduce(
    (sum, item) => sum + clampFlatLineDiscount(item.discount, item.quantity, item.unitPrice),
    0,
  );
  const totalAmount = subTotal - itemDiscounts - input.discountAmount;
  return { subTotal, totalAmount: Math.max(0, totalAmount) };
}

export async function createDraftInvoice(input: SaveInvoiceInput, createdById: string) {
  const { subTotal, totalAmount } = computeTotals(input);
  const code = await generateInvoiceCode();

  return prisma.invoice.create({
    data: {
      code,
      branchId: input.branchId,
      customerId: input.customerId ?? null,
      saleMode: input.saleMode,
      note: input.note ?? null,
      subTotal,
      discountAmount: input.discountAmount,
      totalAmount,
      createdById,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: clampFlatLineDiscount(item.discount, item.quantity, item.unitPrice),
          lineTotal: computeLineTotal(item),
        })),
      },
    },
    include: { items: true },
  });
}

export async function updateDraftInvoice(id: string, input: SaveInvoiceInput) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new SalesError("Không tìm thấy hóa đơn", 404);
  if (existing.status !== InvoiceStatus.DRAFT) {
    throw new SalesError("Chỉ có thể sửa hóa đơn ở trạng thái nháp");
  }

  const { subTotal, totalAmount } = computeTotals(input);

  return prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        customerId: input.customerId ?? null,
        saleMode: input.saleMode,
        note: input.note ?? null,
        subTotal,
        discountAmount: input.discountAmount,
        totalAmount,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            lineTotal: computeLineTotal(item),
          })),
        },
      },
      include: { items: true },
    });
  });
}

// The most correctness-critical operation in the system: finalizing a sale must
// atomically record the invoice + payments, deduct stock, and update customer debt.
export async function checkoutInvoice(id: string, input: CheckoutInvoiceInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) throw new SalesError("Không tìm thấy hóa đơn", 404);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new SalesError("Hóa đơn đã được xử lý trước đó");
    }

    const paidAmount = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalAmount = Number(invoice.totalAmount);
    if (paidAmount < totalAmount) {
      const debtPortion = input.payments
        .filter((p) => p.method === PaymentMethod.DEBT)
        .reduce((sum, p) => sum + p.amount, 0);
      if (paidAmount + debtPortion < totalAmount) {
        throw new SalesError("Tổng số tiền thanh toán không đủ so với tổng hóa đơn");
      }
    }

    await tx.payment.createMany({
      data: input.payments.map((p) => ({ invoiceId: id, method: p.method, amount: p.amount })),
    });

    await tx.stockMovement.create({
      data: {
        type: "SALE",
        branchId: invoice.branchId,
        note: `Bán hàng - ${invoice.code}`,
        createdById,
        lines: {
          create: invoice.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    });

    for (const item of invoice.items) {
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: invoice.branchId } },
        create: { productId: item.productId, branchId: invoice.branchId, quantity: -Number(item.quantity) },
        update: { quantity: { decrement: item.quantity } },
      });
    }

    const debtAmount = input.payments
      .filter((p) => p.method === PaymentMethod.DEBT)
      .reduce((sum, p) => sum + p.amount, 0);

    if (debtAmount > 0 && invoice.customerId) {
      await tx.debtLedgerEntry.create({
        data: {
          customerId: invoice.customerId,
          amount: debtAmount,
          invoiceId: invoice.id,
          note: `Ghi nợ hóa đơn ${invoice.code}`,
        },
      });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { debtBalance: { increment: debtAmount } },
      });
    }

    return tx.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.COMPLETED,
        paidAmount,
        completedAt: new Date(),
      },
      include: { items: true, payments: true },
    });
  });
}

export async function voidInvoice(id: string, _voidedById: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
    if (!invoice) throw new SalesError("Không tìm thấy hóa đơn", 404);
    if (invoice.status !== InvoiceStatus.COMPLETED) {
      throw new SalesError("Chỉ có thể hủy hóa đơn đã hoàn tất");
    }

    for (const item of invoice.items) {
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: invoice.branchId } },
        create: { productId: item.productId, branchId: invoice.branchId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }

    const debtPayments = invoice.payments.filter((p) => p.method === PaymentMethod.DEBT);
    if (debtPayments.length > 0 && invoice.customerId) {
      const debtAmount = debtPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      await tx.debtLedgerEntry.create({
        data: {
          customerId: invoice.customerId,
          amount: -debtAmount,
          invoiceId: invoice.id,
          note: `Hủy hóa đơn ${invoice.code}`,
        },
      });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { debtBalance: { decrement: debtAmount } },
      });
    }

    return tx.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
  });
}

export async function listInvoices(filters: {
  branchId?: string;
  status?: string;
  customerId?: string;
  createdById?: string;
  from?: string;
  to?: string;
}) {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as InvoiceStatus } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.createdById ? { createdById: filters.createdById } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    include: {
      items: { include: { product: true } },
      payments: true,
      customer: { select: { code: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = [...new Set(invoices.map((inv) => inv.createdById))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
  const userNameById = new Map(users.map((u) => [u.id, u.username]));

  return invoices.map((inv) => ({
    ...inv,
    subTotal: Number(inv.subTotal),
    discountAmount: Number(inv.discountAmount),
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    createdByName: userNameById.get(inv.createdById) ?? "N/A",
  }));
}

export { SalesError };
