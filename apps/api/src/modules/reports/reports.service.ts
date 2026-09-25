import { prisma } from "../../lib/prisma.js";

interface DateRange {
  from?: string;
  to?: string;
  branchId?: string;
}

// The business operates out of Ho Chi Minh City (UTC+7, no DST), but this
// server runs in UTC. Every timestamp stored is a real UTC instant — correct
// for "which invoices fall in this range" filtering — but grouping by hour/
// day/weekday must bucket by the LOCAL calendar day, or a 2pm Vietnam sale
// lands in the wrong hour/day bucket. Shifting by the fixed +7h offset and
// reading the UTC getters off the shifted instant gives the Vietnam-local
// calendar fields without needing a timezone database.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
function toVnParts(date: Date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    day: shifted.getUTCDay(),
  };
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
    const vn = toVnParts(invoice.completedAt);
    const key =
      groupBy === "month"
        ? `${vn.year}-${String(vn.month + 1).padStart(2, "0")}`
        : groupBy === "week"
          ? `${vn.year}-W${String(Math.ceil(vn.date / 7)).padStart(2, "0")}`
          : groupBy === "hour"
            ? `${String(vn.hours).padStart(2, "0")}:00`
            : groupBy === "weekday"
              ? weekdayLabel(vn.day)
              : `${vn.year}-${String(vn.month + 1).padStart(2, "0")}-${String(vn.date).padStart(2, "0")}`;
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

export async function getTopProducts(range: DateRange, limit = 10, sortBy: "revenue" | "quantity" = "revenue") {
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
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, limit);
}

export async function getTopCustomers(range: DateRange, limit = 10) {
  const invoices = await prisma.invoice.findMany({
    where: { ...dateFilter(range), customerId: { not: null } },
    select: { customerId: true, totalAmount: true, customer: { select: { name: true } } },
  });

  const totals = new Map<string, { customerId: string; name: string; revenue: number }>();
  for (const inv of invoices) {
    if (!inv.customerId) continue;
    const existing = totals.get(inv.customerId) ?? {
      customerId: inv.customerId,
      name: inv.customer?.name ?? "Khách lẻ",
      revenue: 0,
    };
    existing.revenue += Number(inv.totalAmount);
    totals.set(inv.customerId, existing);
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

// `from`/`to` bound the selected period (e.g. "this month", a custom range —
// see PeriodPreset on the frontend). The comparison percentage is computed
// against the immediately-preceding period of the same length, so it stays
// meaningful regardless of which preset the user picked.
export async function getDashboardSummary(branchId: string | undefined, from: string, to: string) {
  const rangeStart = new Date(from);
  const rangeEnd = new Date(to);
  const rangeMs = Math.max(0, rangeEnd.getTime() - rangeStart.getTime());
  const previousEnd = new Date(rangeStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);

  const branchFilter = branchId ? { branchId } : {};

  const [periodInvoices, previousInvoices, cancelledCount, recentCompleted, recentCancelled] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: rangeStart, lte: rangeEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: previousStart, lte: previousEnd } },
        select: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: { ...branchFilter, status: "CANCELLED", updatedAt: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 20,
        include: { customer: { select: { name: true } } },
      }),
      prisma.invoice.findMany({
        where: { ...branchFilter, status: "CANCELLED" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { customer: { select: { name: true } } },
      }),
    ]);

  const revenue = sumAmount(periodInvoices);
  const previousRevenue = sumAmount(previousInvoices);

  const userIds = [...new Set([...recentCompleted, ...recentCancelled].map((inv) => inv.createdById))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
  const userNameById = new Map(users.map((u) => [u.id, u.username]));

  const recentActivities = [
    ...recentCompleted.map((inv) => ({
      id: inv.id,
      type: "COMPLETED" as const,
      code: inv.code,
      userName: userNameById.get(inv.createdById) ?? "N/A",
      customerName: inv.customer?.name ?? "Khách lẻ",
      totalAmount: Number(inv.totalAmount),
      at: inv.completedAt,
    })),
    ...recentCancelled.map((inv) => ({
      id: inv.id,
      type: "CANCELLED" as const,
      code: inv.code,
      userName: userNameById.get(inv.createdById) ?? "N/A",
      customerName: inv.customer?.name ?? "Khách lẻ",
      totalAmount: Number(inv.totalAmount),
      at: inv.updatedAt,
    })),
  ]
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    .slice(0, 20);

  return {
    revenue,
    invoiceCount: periodInvoices.length,
    cancelledCount,
    changeVsPreviousPct: pctChange(revenue, previousRevenue),
    recentActivities,
  };
}

// "Báo cáo > Cuối ngày": a cashier-style close-out for one calendar day —
// revenue/invoice counts plus how much came in through each payment method,
// so it can be checked against the physical cash drawer at closing time.
export async function getEndOfDay(date: string, branchId?: string) {
  // `date` is a plain "YYYY-MM-DD" picked in the Vietnam-local date picker;
  // anchor the day boundaries to +07:00 explicitly rather than the server's
  // own timezone (Render runs in UTC), or this window silently shifts by 7h.
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(`${date}T23:59:59.999+07:00`);
  const branchFilter = branchId ? { branchId } : {};

  const [completed, cancelledCount, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...branchFilter, status: "COMPLETED", completedAt: { gte: start, lte: end } },
      select: { totalAmount: true },
    }),
    prisma.invoice.count({
      where: { ...branchFilter, status: "CANCELLED", updatedAt: { gte: start, lte: end } },
    }),
    prisma.payment.findMany({
      where: { invoice: { ...branchFilter, status: "COMPLETED", completedAt: { gte: start, lte: end } } },
      select: { method: true, amount: true },
    }),
  ]);

  const byMethod = new Map<string, number>();
  for (const p of payments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));

  return {
    date,
    revenue: completed.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
    invoiceCount: completed.length,
    cancelledCount,
    paymentBreakdown: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
  };
}

// "Phân tích > Hàng hóa": revenue/profit grouped by category, so slow or
// unprofitable categories show up next to the ones carrying the business.
export async function getCategoryPerformance(range: DateRange) {
  const items = await prisma.invoiceItem.findMany({
    where: { invoice: dateFilter(range) },
    include: { product: { include: { category: true } } },
  });

  const totals = new Map<string, { categoryId: string; name: string; quantity: number; revenue: number; cost: number }>();
  for (const item of items) {
    const categoryId = item.product.categoryId ?? "none";
    const name = item.product.category?.name ?? "Chưa phân loại";
    const existing = totals.get(categoryId) ?? { categoryId, name, quantity: 0, revenue: 0, cost: 0 };
    existing.quantity += Number(item.quantity);
    existing.revenue += Number(item.lineTotal);
    existing.cost += Number(item.quantity) * Number(item.product.costPrice);
    totals.set(categoryId, existing);
  }

  return Array.from(totals.values())
    .map((c) => ({ ...c, profit: c.revenue - c.cost }))
    .sort((a, b) => b.revenue - a.revenue);
}

// "Phân tích > Khách hàng": how many people are actually buying, how much
// each one spends on average, and how much debt is outstanding overall —
// distinct from Báo cáo's "top spenders" list.
export async function getCustomerInsights(range: DateRange) {
  const [invoices, totalCustomers, debtCustomers] = await Promise.all([
    prisma.invoice.findMany({
      where: dateFilter(range),
      select: { customerId: true, totalAmount: true },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customer.findMany({
      where: { deletedAt: null, debtBalance: { gt: 0 } },
      select: { debtBalance: true },
    }),
  ]);

  const revenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const buyingCustomerIds = new Set(invoices.map((inv) => inv.customerId).filter((id): id is string => !!id));
  const walkInRevenue = invoices
    .filter((inv) => !inv.customerId)
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  return {
    totalCustomers,
    buyingCustomers: buyingCustomerIds.size,
    avgRevenuePerCustomer: buyingCustomerIds.size > 0 ? (revenue - walkInRevenue) / buyingCustomerIds.size : 0,
    debtCustomerCount: debtCustomers.length,
    totalDebt: debtCustomers.reduce((sum, c) => sum + Number(c.debtBalance), 0),
  };
}

// "Phân tích > Hiệu quả": revenue per seller (cashier), for comparing staff
// performance over a period.
export async function getSellerPerformance(range: DateRange) {
  const invoices = await prisma.invoice.findMany({
    where: dateFilter(range),
    select: { createdById: true, totalAmount: true },
  });

  const totals = new Map<string, { userId: string; revenue: number; invoiceCount: number }>();
  for (const inv of invoices) {
    const existing = totals.get(inv.createdById) ?? { userId: inv.createdById, revenue: 0, invoiceCount: 0 };
    existing.revenue += Number(inv.totalAmount);
    existing.invoiceCount += 1;
    totals.set(inv.createdById, existing);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...totals.keys()] } },
    select: { id: true, username: true },
  });
  const usernameById = new Map(users.map((u) => [u.id, u.username]));

  return Array.from(totals.values())
    .map((t) => ({ ...t, username: usernameById.get(t.userId) ?? "N/A" }))
    .sort((a, b) => b.revenue - a.revenue);
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
