import { Prisma, StockMovementType } from "@prisma/client";
import type { CreateStockMovementInput } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";

async function upsertStock(
  tx: Prisma.TransactionClient,
  branchId: string,
  productId: string,
  delta: Prisma.Decimal.Value,
) {
  await tx.stockItem.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: { productId, branchId, quantity: delta },
    update: { quantity: { increment: delta } },
  });
}

export async function createStockMovement(input: CreateStockMovementInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        type: input.type as StockMovementType,
        branchId: input.branchId,
        fromBranchId: input.fromBranchId ?? null,
        toBranchId: input.toBranchId ?? null,
        supplierId: input.supplierId ?? null,
        note: input.note ?? null,
        createdById,
        lines: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of input.lines) {
      switch (input.type) {
        case "IMPORT":
        case "STOCK_TAKE":
          await upsertStock(tx, input.branchId, line.productId, line.quantity);
          break;
        case "EXPORT":
          await upsertStock(tx, input.branchId, line.productId, -line.quantity);
          break;
        case "TRANSFER": {
          if (!input.fromBranchId || !input.toBranchId) {
            throw new Error("Chuyển kho cần fromBranchId và toBranchId");
          }
          await upsertStock(tx, input.fromBranchId, line.productId, -line.quantity);
          await upsertStock(tx, input.toBranchId, line.productId, line.quantity);
          break;
        }
        default:
          break;
      }
    }

    return movement;
  });
}

// The 3 branches share a single physical warehouse (the user's explicit call:
// "chung 1 kho hàng chung 1 hệ thống khách hàng"), so tồn kho is the SUM of a
// product's StockItem rows across every branch, not just the requesting
// branch's own row — mirrors how Product/Customer are already branch-less.
export async function getStock(_branchId: string, options: { lowStock?: boolean; search?: string } = {}) {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(options.search ? { name: { contains: options.search, mode: "insensitive" } } : {}),
    },
    include: { unit: true, stockItems: true },
    orderBy: { name: "asc" },
  });

  const mapped = products.map(({ stockItems, ...product }) => ({
    productId: product.id,
    branchId: _branchId,
    quantity: stockItems.reduce((sum, s) => sum + Number(s.quantity), 0),
    product: {
      ...product,
      costPrice: Number(product.costPrice),
      sellPrice: Number(product.sellPrice),
      reorderThreshold: product.reorderThreshold ? Number(product.reorderThreshold) : null,
    },
  }));

  if (options.lowStock) {
    return mapped.filter(
      (item) => item.product.reorderThreshold !== null && item.quantity < item.product.reorderThreshold,
    );
  }
  return mapped;
}

export async function listMovements(filters: { branchId?: string; type?: string }) {
  return prisma.stockMovement.findMany({
    where: {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.type ? { type: filters.type as StockMovementType } : {}),
    },
    include: { lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
