import { InvoiceStatus, PaymentMethod, PaymentStatus, PreorderStatus } from "@prisma/client";
import {
  ROLES,
  clampFlatLineDiscount,
  type CheckoutInvoiceInput,
  type ConfirmPaymentInput,
  type SaveInvoiceInput,
} from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { generateInvoiceCode } from "../../lib/codes.js";
import { classifyPayment } from "../../lib/payment-kind.js";

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
interface CheckoutOptions {
  // Set when the invoice delivers a pre-order: the deposit already taken, and the pre-order to close.
  preorder?: { id: string; depositAmount: number };
}

export async function checkoutInvoice(
  id: string,
  input: CheckoutInvoiceInput,
  createdById: string,
  options: CheckoutOptions = {},
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!invoice) throw new SalesError("Không tìm thấy hóa đơn", 404);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new SalesError("Hóa đơn đã được xử lý trước đó");
    }

    // Stock is shared across all branches (one physical warehouse), so
    // availability is checked against the SUM across branches, not just the
    // branch the invoice was created at.
    const stockItems = await tx.stockItem.findMany({
      where: { productId: { in: invoice.items.map((item) => item.productId) } },
    });
    const stockByProductId = new Map<string, number>();
    for (const s of stockItems) {
      stockByProductId.set(s.productId, (stockByProductId.get(s.productId) ?? 0) + Number(s.quantity));
    }
    for (const item of invoice.items) {
      const available = stockByProductId.get(item.productId) ?? 0;
      if (available < Number(item.quantity)) {
        throw new SalesError(`Không đủ số lượng tồn kho cho sản phẩm ${item.product.name}`);
      }
    }

    const totalAmount = Number(invoice.totalAmount);
    // No payment lines = one-tap invoice: how it was paid is confirmed afterwards.
    const pendingPayment = input.payments.length === 0;
    const paidAmount = pendingPayment ? totalAmount : input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (!pendingPayment && paidAmount < totalAmount) {
      const debtPortion = input.payments
        .filter((p) => p.method === PaymentMethod.DEBT)
        .reduce((sum, p) => sum + p.amount, 0);
      if (paidAmount + debtPortion < totalAmount) {
        throw new SalesError("Tổng số tiền thanh toán không đủ so với tổng hóa đơn");
      }
    }

    if (!pendingPayment) {
      await tx.payment.createMany({
        data: input.payments.map((p) => ({ invoiceId: id, method: p.method, amount: p.amount })),
      });
    }

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

    const preorder = options.preorder;
    if (preorder) {
      // Only one delivery per pre-order, even if two requests race.
      const closed = await tx.preorder.updateMany({
        where: { id: preorder.id, status: PreorderStatus.DEPOSITED },
        data: { status: PreorderStatus.DELIVERED, deliveredAt: new Date() },
      });
      if (closed.count !== 1) throw new SalesError("Đơn đặt hàng đã được giao hoặc đã hủy");
    }
    // The deposit already covers part of a delivered pre-order; if nothing else is owed there is nothing to confirm.
    const owedNow = totalAmount - (preorder?.depositAmount ?? 0);
    const needsConfirmation = pendingPayment && owedNow > 0.5;

    return tx.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.COMPLETED,
        paidAmount,
        completedAt: new Date(),
        paymentStatus: needsConfirmation ? PaymentStatus.PENDING : PaymentStatus.CONFIRMED,
        ...(needsConfirmation ? {} : { paymentConfirmedAt: new Date(), paymentConfirmedById: createdById }),
        ...(preorder ? { preorderId: preorder.id, depositAmount: preorder.depositAmount } : {}),
      },
      include: { items: true, payments: true },
    });
  });
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDay = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

interface Actor {
  id: string;
  username: string;
  role: string;
}

// Confirms (or later corrects) how an invoice was paid. The lines only redistribute the amount still
// owed across methods, so the invoice total never changes. Staff can do it for their own invoice on the
// day it was issued; after that only the admin can. Every change is written to the payment log.
export async function confirmInvoicePayment(id: string, input: ConfirmPaymentInput, actor: Actor) {
  const isAdmin = actor.role === ROLES.ADMIN;
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new SalesError("Không tìm thấy hóa đơn", 404);
    if (invoice.status !== InvoiceStatus.COMPLETED) throw new SalesError("Chỉ xác nhận thanh toán cho hóa đơn đã hoàn tất");

    const issuedAt = invoice.completedAt ?? invoice.createdAt;
    if (!isAdmin) {
      if (invoice.createdById !== actor.id) {
        throw new SalesError("Bạn chỉ được xác nhận thanh toán hóa đơn của chính mình", 403);
      }
      if (vnDay(issuedAt) !== vnDay(new Date())) {
        throw new SalesError("Đã qua ngày lập hóa đơn, chỉ admin mới được sửa thanh toán", 403);
      }
    }

    const debtLines = input.payments.filter((p) => p.method === PaymentMethod.DEBT);
    if (debtLines.length > 0) {
      if (!isAdmin) throw new SalesError("Chỉ admin được chọn ghi nợ", 403);
      if (!invoice.customerId) throw new SalesError("Ghi nợ cần có khách hàng");
    }

    const expected = Number(invoice.totalAmount) - Number(invoice.depositAmount);
    const sum = input.payments.reduce((s, p) => s + p.amount, 0);
    if (sum > expected + 0.5) {
      throw new SalesError(`Vượt ${Math.round(sum - expected).toLocaleString("en-US")} đ so với số tiền cần thanh toán`);
    }
    // Less than owed is fine: the rest is collected later with addInvoicePayment (deposit now, balance at pickup).
    const settled = Math.abs(sum - expected) <= 0.5;

    // Undo the previous debt (if any), then apply the debt of the new lines.
    const oldDebt = invoice.payments
      .filter((p) => p.method === PaymentMethod.DEBT)
      .reduce((s, p) => s + Number(p.amount), 0);
    const newDebt = debtLines.reduce((s, p) => s + p.amount, 0);
    if (invoice.customerId && oldDebt !== newDebt) {
      const delta = newDebt - oldDebt;
      await tx.debtLedgerEntry.create({
        data: {
          customerId: invoice.customerId,
          amount: delta,
          invoiceId: invoice.id,
          note: `Điều chỉnh thanh toán hóa đơn ${invoice.code}`,
        },
      });
      await tx.customer.update({ where: { id: invoice.customerId }, data: { debtBalance: { increment: delta } } });
    }

    const before = {
      paymentStatus: invoice.paymentStatus,
      payments: invoice.payments.map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference })),
    };
    // A line that is unchanged (same method and amount) keeps the date it was really received.
    const unused = [...invoice.payments];
    const dated = input.payments.map((p) => {
      const at = unused.findIndex((o) => o.method === p.method && Number(o.amount) === p.amount);
      const createdAt = at >= 0 ? unused.splice(at, 1)[0]!.createdAt : new Date();
      return { ...p, createdAt };
    });
    await tx.payment.deleteMany({ where: { invoiceId: id } });
    await tx.payment.createMany({
      data: dated.map((p) => ({
        invoiceId: id,
        method: p.method,
        amount: p.amount,
        reference: p.reference || null,
        createdAt: p.createdAt,
      })),
    });
    const nextStatus = settled ? PaymentStatus.CONFIRMED : PaymentStatus.PARTIAL;
    const updated = await tx.invoice.update({
      where: { id },
      data: {
        paymentStatus: nextStatus,
        paidAmount: sum + Number(invoice.depositAmount),
        paymentConfirmedAt: new Date(),
        paymentConfirmedById: actor.id,
      },
      include: { items: true, payments: true },
    });
    await tx.invoicePaymentLog.create({
      data: {
        invoiceId: id,
        userId: actor.id,
        username: actor.username,
        action: invoice.paymentStatus === PaymentStatus.PENDING ? "CONFIRM" : "EDIT",
        before,
        after: {
          paymentStatus: nextStatus,
          payments: input.payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference ?? null })),
        },
      },
    });
    return updated;
  });
}

// Collects more of what is still owed on a partly paid invoice (for example the balance when the customer
// picks the goods up). The new lines are dated today, and the invoice becomes fully paid once nothing is left.
export async function addInvoicePayment(id: string, input: ConfirmPaymentInput, actor: Actor) {
  const isAdmin = actor.role === ROLES.ADMIN;
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new SalesError("Không tìm thấy hóa đơn", 404);
    if (invoice.status !== InvoiceStatus.COMPLETED) throw new SalesError("Chỉ thu tiền cho hóa đơn đã hoàn tất");
    if (!isAdmin && invoice.createdById !== actor.id) {
      throw new SalesError("Bạn chỉ được thu tiền hóa đơn của chính mình", 403);
    }
    if (invoice.paymentStatus === PaymentStatus.PENDING) {
      throw new SalesError("Hóa đơn này chưa xác nhận thanh toán lần đầu");
    }
    if (input.payments.some((p) => p.method === PaymentMethod.DEBT)) {
      throw new SalesError("Không dùng ghi nợ khi thu thêm tiền");
    }

    const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(invoice.totalAmount) - Number(invoice.depositAmount) - paid;
    if (remaining <= 0.5) throw new SalesError("Hóa đơn đã thu đủ tiền");
    const sum = input.payments.reduce((s, p) => s + p.amount, 0);
    if (sum > remaining + 0.5) {
      throw new SalesError(`Chỉ còn phải thu ${Math.round(remaining).toLocaleString("en-US")} đ`);
    }

    await tx.payment.createMany({
      data: input.payments.map((p) => ({
        invoiceId: id,
        method: p.method,
        amount: p.amount,
        reference: p.reference || null,
      })),
    });
    const settled = Math.abs(sum - remaining) <= 0.5;
    const nextStatus = settled ? PaymentStatus.CONFIRMED : PaymentStatus.PARTIAL;
    const updated = await tx.invoice.update({
      where: { id },
      data: { paymentStatus: nextStatus, paidAmount: { increment: sum } },
      include: { items: true, payments: true },
    });
    const beforeLines = invoice.payments.map((p) => ({
      method: p.method,
      amount: Number(p.amount),
      reference: p.reference,
    }));
    await tx.invoicePaymentLog.create({
      data: {
        invoiceId: id,
        userId: actor.id,
        username: actor.username,
        action: "ADD",
        before: { paymentStatus: invoice.paymentStatus, payments: beforeLines },
        after: {
          paymentStatus: nextStatus,
          payments: [
            ...beforeLines,
            ...input.payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference ?? null })),
          ],
        },
      },
    });
    return updated;
  });
}

// The day's money book (what used to be the paper thu-chi sheet): every payment received on a Vietnam-local
// day, labelled as a whole sale, a deposit (first part of a partly paid invoice) or the balance collected later.
export async function listPaymentsOnDay(date: string, actor: Actor, sellerId?: string) {
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(`${date}T23:59:59.999+07:00`);
  const isAdmin = actor.role === ROLES.ADMIN;
  const ownerFilter = isAdmin ? (sellerId ? { createdById: sellerId } : {}) : { createdById: actor.id };

  const rows = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end }, invoice: { status: InvoiceStatus.COMPLETED, ...ownerFilter } },
    include: {
      invoice: {
        select: {
          id: true,
          code: true,
          totalAmount: true,
          depositAmount: true,
          createdById: true,
          customer: { select: { name: true } },
          payments: { select: { id: true, createdAt: true, amount: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.COMPLETED,
      paymentStatus: PaymentStatus.PENDING,
      completedAt: { gte: start, lte: end },
      ...ownerFilter,
    },
    select: { code: true, totalAmount: true, depositAmount: true, customer: { select: { name: true } } },
    orderBy: { completedAt: "asc" },
  });

  // Doanh số: what was sold that day (invoice totals), whether or not it has been paid in full yet.
  const sales = await prisma.invoice.aggregate({
    where: { status: InvoiceStatus.COMPLETED, completedAt: { gte: start, lte: end }, ...ownerFilter },
    _sum: { totalAmount: true },
  });

  const userIds = [...new Set(rows.map((r) => r.invoice.createdById))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
  const nameById = new Map(users.map((u) => [u.id, u.username]));

  return {
    date,
    salesTotal: Number(sales._sum.totalAmount ?? 0),
    payments: rows.map((r) => {
      const owed = Number(r.invoice.totalAmount) - Number(r.invoice.depositAmount);
      const { kind, remainingAfter, firstPaidAt } = classifyPayment(
        r.invoice.payments.map((p) => ({ id: p.id, createdAt: p.createdAt, amount: Number(p.amount) })),
        { id: r.id, createdAt: r.createdAt, amount: Number(r.amount) },
        owed,
      );
      return {
        remainingAfter,
        firstPaidAt: firstPaidAt.toISOString(),
        id: r.id,
        paidAt: r.createdAt.toISOString(),
        invoiceCode: r.invoice.code,
        customerName: r.invoice.customer?.name ?? "Khách lẻ",
        method: r.method,
        amount: Number(r.amount),
        reference: r.reference,
        kind,
        sellerName: nameById.get(r.invoice.createdById) ?? "N/A",
      };
    }),
    pending: pendingInvoices.map((i) => ({
      invoiceCode: i.code,
      customerName: i.customer?.name ?? "Khách lẻ",
      amount: Number(i.totalAmount) - Number(i.depositAmount),
    })),
  };
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

    // Cancelling the invoice of a delivered pre-order puts the pre-order back to "Đã đặt cọc".
    if (invoice.preorderId) {
      await tx.preorder.update({
        where: { id: invoice.preorderId },
        data: { status: PreorderStatus.DEPOSITED, deliveredAt: null },
      });
    }
    return tx.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED, ...(invoice.preorderId ? { preorderId: null } : {}) },
    });
  });
}

// Bulk version of voidInvoice for the Orders page's multi-select "Hủy" action.
// Each invoice gets its own transaction (reusing voidInvoice as-is) rather than
// one big transaction, so a large selection can't blow past Neon's interactive
// transaction timeout. Invoices that are already DRAFT/CANCELLED, or don't
// exist, are silently skipped instead of failing the whole batch.
export async function voidInvoices(ids: string[], voidedById: string) {
  for (const id of ids) {
    try {
      await voidInvoice(id, voidedById);
    } catch (err) {
      if (!(err instanceof SalesError)) throw err;
    }
  }
}

export async function listInvoices(filters: {
  branchId?: string;
  status?: string;
  customerId?: string;
  createdById?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}) {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as PaymentStatus } : {}),
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
      customer: { select: { code: true, name: true, phone: true, note: true } },
      preorder: { select: { code: true, depositMethod: true } },
      paymentLogs: { orderBy: { createdAt: "asc" } },
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
    depositAmount: Number(inv.depositAmount),
    createdByName: userNameById.get(inv.createdById) ?? "N/A",
    items: inv.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      lineTotal: Number(item.lineTotal),
    })),
    payments: inv.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  }));
}

export { SalesError };
