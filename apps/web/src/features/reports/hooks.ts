import { useQuery } from "@tanstack/react-query";
import {
  fetchBranchComparison,
  fetchCategoryPerformance,
  fetchCustomerInsights,
  fetchDashboardSummary,
  fetchEndOfDay,
  fetchProductAnalysis,
  fetchProfit,
  fetchQuantityByUser,
  fetchQuantitySold,
  fetchRevenue,
  fetchSellerPerformance,
  fetchStockValue,
  fetchTopCustomers,
  fetchTopProducts,
  type ReportRange,
} from "./api";

export function useRevenueReport(params: ReportRange & { groupBy?: "day" | "week" | "month" | "hour" | "weekday" }) {
  return useQuery({
    queryKey: ["reports", "revenue", params],
    queryFn: () => fetchRevenue(params),
    refetchInterval: 60_000,
  });
}

export function useDashboardSummary(params: { branchId?: string; from: string; to: string; createdById?: string }) {
  return useQuery({
    queryKey: ["reports", "dashboard-summary", params],
    queryFn: () => fetchDashboardSummary(params),
    refetchInterval: 60_000,
  });
}

export function useQuantityByUserReport(params: Omit<ReportRange, "createdById">) {
  return useQuery({
    queryKey: ["reports", "quantity-by-user", params],
    queryFn: () => fetchQuantityByUser(params),
    refetchInterval: 60_000,
  });
}

export function useQuantitySoldReport(params: ReportRange & { groupBy: "day" | "month" | "year" }) {
  return useQuery({
    queryKey: ["reports", "quantity-sold", params],
    queryFn: () => fetchQuantitySold(params),
    refetchInterval: 60_000,
  });
}

export function useTopProductsReport(
  params: ReportRange & { limit?: number; sortBy?: "revenue" | "quantity"; goodsType?: "TN" | "CN" },
) {
  return useQuery({
    queryKey: ["reports", "top-products", params],
    queryFn: () => fetchTopProducts(params),
    refetchInterval: 60_000,
  });
}

export function useTopCustomersReport(params: ReportRange & { limit?: number }) {
  return useQuery({
    queryKey: ["reports", "top-customers", params],
    queryFn: () => fetchTopCustomers(params),
    refetchInterval: 60_000,
  });
}

export function useStockValueReport(branchId?: string) {
  return useQuery({ queryKey: ["reports", "stock-value", branchId], queryFn: () => fetchStockValue(branchId) });
}

export function useBranchComparisonReport(params: { from?: string; to?: string; createdById?: string }) {
  return useQuery({ queryKey: ["reports", "branch-comparison", params], queryFn: () => fetchBranchComparison(params) });
}

export function useProfitReport(params: ReportRange) {
  return useQuery({ queryKey: ["reports", "profit", params], queryFn: () => fetchProfit(params) });
}

export function useEndOfDayReport(params: { branchId?: string; date: string }) {
  return useQuery({ queryKey: ["reports", "end-of-day", params], queryFn: () => fetchEndOfDay(params) });
}

export function useCategoryPerformanceReport(params: ReportRange) {
  return useQuery({
    queryKey: ["reports", "category-performance", params],
    queryFn: () => fetchCategoryPerformance(params),
  });
}

export function useCustomerInsightsReport(params: ReportRange) {
  return useQuery({ queryKey: ["reports", "customer-insights", params], queryFn: () => fetchCustomerInsights(params) });
}

export function useSellerPerformanceReport(params: ReportRange) {
  return useQuery({ queryKey: ["reports", "seller-performance", params], queryFn: () => fetchSellerPerformance(params) });
}

export function useProductAnalysis(params: { productId: string; days: number; branchId?: string }, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "product-analysis", params],
    queryFn: () => fetchProductAnalysis(params),
    enabled,
  });
}
