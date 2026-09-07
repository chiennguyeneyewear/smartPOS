import { apiClient } from "@/lib/api-client";

export interface ReportRange {
  branchId?: string;
  from?: string;
  to?: string;
}

export async function fetchRevenue(params: ReportRange & { groupBy?: "day" | "week" | "month" }) {
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
