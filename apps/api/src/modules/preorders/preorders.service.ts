import { PaymentMethod, PreorderStatus } from "@prisma/client";
import {
  ROLES,
  type PreorderCancelInput,
  type PreorderCreateInput,
  type PreorderDeliverInput,
  type PreorderDepositConfirmInput,
} from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { generatePreorderCode } from "../../lib/codes.js";
import { SalesError, checkoutInvoice, createDraftInvoice } from "../sales/sales.service.js";

interface Actor {
  id: string;
  username: string;
  role: string;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDay = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

const include = {
  customer: { select: { code: true, name: true, phone: true } },
  items: { include: { product: { select: { name: true, sku: true } } } },
  invoice: { select: { code: true } },
} as const;

type PreorderRow = NonNullable<Awaited<ReturnType<typeof loadRow>>>;

async function loadRow(id: string) {
  return prisma.preorder.findUnique({ where: { id }, include });
}

async function withCreators<T extends { createdById: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.createdById))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
  const nameById = new Map(users.map((u) => [u.id, u.username]));
  return rows.map((r) => ({ ...r, createdByName: nameById.get(r.createdById) ?? "N/A" }));
}

function toDto(row: PreorderRow & { createdByName: string }) {
  const { invoice, ...rest } = row;
  return {
    ...rest,
    subTotal: Number(row.subTotal),
    depositAmount: Number(row.depositAmount),
    refundAmount: Number(row.refundAmount),
    invoiceCode: invoice?.code ?? null,
    items: row.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
  };
}

export async function createPreorder(input: PreorderCreateInput, actor: Actor) {
  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, deletedAt: null } });
  if (!customer) throw new SalesError("Không tìm thấy khách hàng");

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, deletedAt: null },
    select: { id: true },
  });
  if (products.length !== new Set(input.items.map((i) => i.productId)).size) {
    throw new SalesError("Có sản phẩm không còn tồn tại");
  }

  const subTotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  if (input.depositAmount > subTotal) throw new SalesError("Tiền cọc không được lớn hơn tổng giá trị đơn");

  const code = await generatePreorderCode();
  const created = await prisma.preorder.create({
    data: {
      code,
      branchId: input.branchId,
      customerId: input.customerId,
      note: input.note || null,
      prescription: input.prescription || null,
      subTotal,
      depositAmount: input.depositAmount,
      createdById: actor.id,
      items: {
        create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      },
    },
    include,
  });
  const [dto] = await withCreators([created]);
  return toDto(dto!);
}

export async function listPreorders(filters: { status?: string }, actor: Actor) {
  const rows = await prisma.preorder.findMany({
    where: {
      ...(filters.status ? { status: filters.status as PreorderStatus } : {}),
      // Staff only ever see the pre-orders they took themselves; the admin sees all of them.
      ...(actor.role === ROLES.ADMIN ? {} : { createdById: actor.id }),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (await withCreators(rows)).map(toDto);
}

export async function getPreorder(id: string, actor: Actor) {
  const row = await loadRow(id);
  if (!row) throw new SalesError("Không tìm thấy đơn đặt hàng", 404);
  if (actor.role !== ROLES.ADMIN && row.createdById !== actor.id) {
    throw new SalesError("Bạn không có quyền xem đơn này", 403);
  }
  const [dto] = await withCreators([row]);
  return toDto(dto!);
}

// Records how the deposit was actually paid. Staff can do it for their own pre-order on the day it was
// taken; after that only the admin can.
export async function confirmDeposit(id: string, input: PreorderDepositConfirmInput, actor: Actor) {
  const row = await getPreorder(id, actor);
  if (row.status !== PreorderStatus.DEPOSITED) throw new SalesError("Chỉ xác nhận được cọc của đơn đang chờ giao");
  if (actor.role !== ROLES.ADMIN && vnDay(new Date(row.createdAt)) !== vnDay(new Date())) {
    throw new SalesError("Đã qua ngày nhận cọc, chỉ admin mới được sửa", 403);
  }
  await prisma.preorder.update({
    where: { id },
    data: {
      depositMethod: input.method as PaymentMethod,
      depositReference: input.reference || null,
      depositConfirmedAt: new Date(),
      depositConfirmedById: actor.id,
    },
  });
  return getPreorder(id, actor);
}

// Delivers the goods: turns the pre-order into an invoice. The deposit is already paid, so what is still
// owed is total - deposit; the discount is entered only here and can never dig into the deposit.
export async function deliverPreorder(id: string, input: PreorderDeliverInput, actor: Actor) {
  const row = await getPreorder(id, actor);
  if (row.status !== PreorderStatus.DEPOSITED) throw new SalesError("Đơn đã được giao hoặc đã hủy");

  const maxDiscount = row.subTotal - row.depositAmount;
  if (input.discountAmount > maxDiscount + 0.5) {
    throw new SalesError(
      `Giảm giá tối đa ${Math.round(maxDiscount).toLocaleString("en-US")} đ (không vượt quá số còn thiếu)`,
    );
  }

  const draft = await createDraftInvoice(
    {
      branchId: input.branchId,
      customerId: row.customerId,
      saleMode: "NORMAL",
      note: `Giao đơn đặt hàng ${row.code}`,
      discountAmount: input.discountAmount,
      items: row.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: 0 })),
    },
    actor.id,
  );
  try {
    await checkoutInvoice(draft.id, { payments: [] }, actor.id, {
      preorder: { id: row.id, depositAmount: row.depositAmount },
    });
  } catch (error) {
    await prisma.invoice.delete({ where: { id: draft.id } }).catch(() => undefined);
    throw error;
  }
  return getPreorder(id, actor);
}

// Admin only. Records the reason and how much of the deposit went back to the customer.
export async function cancelPreorder(id: string, input: PreorderCancelInput, actor: Actor) {
  const row = await getPreorder(id, actor);
  if (row.status !== PreorderStatus.DEPOSITED) throw new SalesError("Chỉ hủy được đơn đang chờ giao");
  if (input.refundAmount > row.depositAmount) throw new SalesError("Số hoàn cọc không được lớn hơn tiền cọc");
  await prisma.preorder.update({
    where: { id },
    data: {
      status: PreorderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: input.reason,
      refundAmount: input.refundAmount,
    },
  });
  return getPreorder(id, actor);
}
