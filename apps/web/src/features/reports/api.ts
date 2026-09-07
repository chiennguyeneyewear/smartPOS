import { apiClient } from "@/lib/api-client";

export interface ReportRange {
  branchId?: string;
  from?: string;
  to?: string;
}

export interface DashboardSummary {
  revenueToday: number;
  invoiceCountToday: number;
  cancelledCountToday: number;
  changeVsYesterdayPct: number;
  changeVsLastMonthPct: number;
  revenueMonth: number;
  recentInvoices: {
    id: string;
    code: string;
    customerName: string;
    totalAmount: number;
    completedAt: string | null;
  }[];
  birthdaysToday: { id: string; name: string }[];
}

export async function fetchRevenue(params: ReportRange & { groupBy?: "day" | "week" | "month" | "hour" | "weekday" }) {
  const { data } = await apiClient.get<{ data: { period: string; revenue: number }[] }>("/reports/revenue", {
    params,
  });
  return data.data;
}

export async function fetchTopProducts(params: ReportRange & { limit?: number }) {
  const { data } = await apiClient.get<{
    data: { productId: string; name: string; quantity: number; revenue: number }[];
  }>("/reports/top-products", { params });
  return data.data;
}

export async function fetchStockValue(branchId?: string) {
  const { data } = await apiClient.get<{ totalValue: number; totalUnits: number; itemCount: number }>(
    "/reports/stock-value",
    { params: { branchId } },
  );
  return data;
}

export async function fetchBranchComparison(params: { from?: string; to?: string }) {
  const { data } = await apiClient.get<{
    data: { branchId: string; branchName: string; revenue: number; invoiceCount: number }[];
  }>("/reports/branch-comparison", { params });
  return data.data;
}

export async function fetchProfit(params: ReportRange) {
  const { data } = await apiClient.get<{ revenue: number; cost: number; profit: number }>("/reports/profit", {
    params,
  });
  return data;
}

export async function fetchDashboardSummary(branchId?: string) {
  const { data } = await apiClient.get<DashboardSummary>("/reports/dashboard-summary", { params: { branchId } });
  return data;
}
