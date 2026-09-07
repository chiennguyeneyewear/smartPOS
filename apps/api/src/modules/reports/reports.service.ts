import { prisma } from "../../lib/prisma.js";

interface DateRange {
  from?: string;
  to?: string;
  branchId?: string;
}

function dateFilter(range: DateRange) {
  return {
    ...(range.branchId ? { branchId: range.branchId } : {}),
    status: "COMPLETED" as const,
    ...(range.from || range.to
      ? {
          completedAt: {
            ...(range.from ? { gte: new Date(range.from) } : {}),
            ...(range.to ? { lte: new Date(range.to) } : {}),
          },
        }
      : {}),
  };
}

export async function getRevenueOverTime(range: DateRange, groupBy: "day" | "week" | "month" = "day") {
  const invoices = await prisma.invoice.findMany({
    where: dateFilter(range),
    select: { totalAmount: true, completedAt: true },
  });

  const buckets = new Map<string, number>();
  for (const invoice of invoices) {
    if (!invoice.completedAt) continue;
    const d = invoice.completedAt;
    const key =
      groupBy === "month"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : groupBy === "week"
          ? `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, "0")}`
          : d.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(invoice.totalAmount));
  }

  return Array.from(buckets.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export async function getTopProducts(range: DateRange, limit = 10) {
  const items = await prisma.invoiceItem.findMany({
    where: { invoice: dateFilter(range) },
    include: { product: true },
  });

  const totals = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
  for (const item of items) {
    const existing = totals.get(item.productId) ?? {
      productId: item.productId,
      name: item.product.name,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += Number(item.quantity);
    existing.revenue += Number(item.lineTotal);
    totals.set(item.productId, existing);
  }

  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getStockValue(branchId?: string) {
  const items = await prisma.stockItem.findMany({
    where: branchId ? { branchId } : {},
    include: { product: true },
  });
  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.product.costPrice),
    0,
  );
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  return { totalValue, totalUnits, itemCount: items.length };
}

export async function getBranchComparison(range: { from?: string; to?: string }) {
  const branches = await prisma.branch.findMany({ where: { isActive: true } });
  const results = [];
  for (const branch of branches) {
    const invoices = await prisma.invoice.findMany({
      where: dateFilter({ ...range, branchId: branch.id }),
      select: { totalAmount: true },
    });
    const revenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    results.push({ branchId: branch.id, branchName: branch.name, revenue, invoiceCount: invoices.length });
  }
  return results.sort((a, b) => b.revenue - a.revenue);
}

export async function getProfit(range: DateRange) {
  const items = await prisma.invoiceItem.findMany({
    where: { invoice: dateFilter(range) },
    include: { product: true },
  });
  let revenue = 0;
  let cost = 0;
  for (const item of items) {
    revenue += Number(item.lineTotal);
    cost += Number(item.quantity) * Number(item.product.costPrice);
  }
  return { revenue, cost, profit: revenue - cost };
}
