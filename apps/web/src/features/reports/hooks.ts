import { useQuery } from "@tanstack/react-query";
import {
  fetchBranchComparison,
  fetchDashboardSummary,
  fetchProfit,
  fetchRevenue,
  fetchStockValue,
  fetchTopProducts,
  type ReportRange,
} from "./api";

export function useRevenueReport(params: ReportRange & { groupBy?: "day" | "week" | "month" | "hour" | "weekday" }) {
  return useQuery({ queryKey: ["reports", "revenue", params], queryFn: () => fetchRevenue(params) });
}

export function useDashboardSummary(branchId?: string) {
  return useQuery({
    queryKey: ["reports", "dashboard-summary", branchId],
    queryFn: () => fetchDashboardSummary(branchId),
    refetchInterval: 60_000,
  });
}

export function useTopProductsReport(params: ReportRange & { limit?: number }) {
  return useQuery({ queryKey: ["reports", "top-products", params], queryFn: () => fetchTopProducts(params) });
}

export function useStockValueReport(branchId?: string) {
  return useQuery({ queryKey: ["reports", "stock-value", branchId], queryFn: () => fetchStockValue(branchId) });
}

export function useBranchComparisonReport(params: { from?: string; to?: string }) {
  return useQuery({ queryKey: ["reports", "branch-comparison", params], queryFn: () => fetchBranchComparison(params) });
}

export function useProfitReport(params: ReportRange) {
  return useQuery({ queryKey: ["reports", "profit", params], queryFn: () => fetchProfit(params) });
}
