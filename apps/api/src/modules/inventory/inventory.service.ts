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

export async function getStock(branchId: string, options: { lowStock?: boolean; search?: string } = {}) {
  const items = await prisma.stockItem.findMany({
    where: {
      branchId,
      ...(options.search
        ? { product: { name: { contains: options.search, mode: "insensitive" } } }
        : {}),
    },
    include: { product: { include: { unit: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const mapped = items.map((item) => ({
    productId: item.productId,
    branchId: item.branchId,
    quantity: Number(item.quantity),
    product: {
      ...item.product,
      costPrice: Number(item.product.costPrice),
      sellPrice: Number(item.product.sellPrice),
      reorderThreshold: item.product.reorderThreshold ? Number(item.product.reorderThreshold) : null,
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
