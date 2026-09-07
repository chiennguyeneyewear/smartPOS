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

const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
] as const satisfies readonly [string, string, string, string, string, string, string];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const satisfies readonly [number, number, number, number, number, number, number];

function weekdayLabel(dayIndex: number): string {
  return WEEKDAY_LABELS[dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6];
}

export async function getRevenueOverTime(
  range: DateRange,
  groupBy: "day" | "week" | "month" | "hour" | "weekday" = "day",
) {
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
          : groupBy === "hour"
            ? `${String(d.getHours()).padStart(2, "0")}:00`
            : groupBy === "weekday"
              ? weekdayLabel(d.getDay())
              : d.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(invoice.totalAmount));
  }

  if (groupBy === "hour") {
    return Array.from({ length: 24 }, (_, h) => {
      const key = `${String(h).padStart(2, "0")}:00`;
      return { period: key, revenue: buckets.get(key) ?? 0 };
    });
  }

  if (groupBy === "weekday") {
    return WEEKDAY_ORDER.map((dayIndex) => {
      const label = weekdayLabel(dayIndex);
      return { period: label, revenue: buckets.get(label) ?? 0 };
    });
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

export async function getBranchComparison(range: { from?: string; to?: string }, allowedBranchIds?: string[]) {
  const branches = await prisma.branch.findMany({
    where: { isActive: true, ...(allowedBranchIds ? { id: { in: allowedBranchIds } } : {}) },
  });
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

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function sumAmount(invoices: { totalAmount: unknown }[]): number {
  return invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
}

export async function getDashboardSummary(branchId?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayEnd = endOfDay(yesterday);
  const lastMonthSameDay = new Date(today);
  lastMonthSameDay.setMonth(lastMonthSameDay.getMonth() - 1);
  const lastMonthSameDayEnd = endOfDay(lastMonthSameDay);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const branchFilter = branchId ? { branchId } : {};

  const [todayInvoices, yesterdayInvoices, lastMonthInvoices, cancelledCountToday, monthInvoices, recentInvoices, customersWithBirthday] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: today, lte: todayEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: yesterday, lte: yesterdayEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: lastMonthSameDay, lte: lastMonthSameDayEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: { ...branchFilter, status: "CANCELLED", updatedAt: { gte: today, lte: todayEnd } },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: monthStart, lte: todayEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 6,
        include: { customer: { select: { name: true } } },
      }),
      prisma.customer.findMany({
        where: { deletedAt: null, birthday: { not: null } },
        select: { id: true, name: true, birthday: true },
      }),
    ]);

  const revenueToday = sumAmount(todayInvoices);
  const revenueYesterday = sumAmount(yesterdayInvoices);
  const revenueSameDayLastMonth = sumAmount(lastMonthInvoices);

  const birthdaysToday = customersWithBirthday
    .filter((c) => c.birthday && c.birthday.getDate() === now.getDate() && c.birthday.getMonth() === now.getMonth())
    .map((c) => ({ id: c.id, name: c.name }));

  return {
    revenueToday,
    invoiceCountToday: todayInvoices.length,
    cancelledCountToday,
    changeVsYesterdayPct: pctChange(revenueToday, revenueYesterday),
    changeVsLastMonthPct: pctChange(revenueToday, revenueSameDayLastMonth),
    revenueMonth: sumAmount(monthInvoices),
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      code: inv.code,
      customerName: inv.customer?.name ?? "Khách lẻ",
      totalAmount: Number(inv.totalAmount),
      completedAt: inv.completedAt,
    })),
    birthdaysToday,
  };
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
