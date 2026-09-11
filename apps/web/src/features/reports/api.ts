import { apiClient } from "@/lib/api-client";

export interface ReportRange {
  branchId?: string;
  from?: string;
  to?: string;
}

export interface DashboardSummary {
  revenue: number;
  invoiceCount: number;
  cancelledCount: number;
  changeVsPreviousPct: number;
  recentActivities: {
    id: string;
    type: "COMPLETED" | "CANCELLED";
    code: string;
    userName: string;
    customerName: string;
    totalAmount: number;
    at: string | null;
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

export async function fetchTopCustomers(params: ReportRange & { limit?: number }) {
  const { data } = await apiClient.get<{
    data: { customerId: string; name: string; revenue: number }[];
  }>("/reports/top-customers", { params });
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

export async function fetchDashboardSummary(params: { branchId?: string; from: string; to: string }) {
  const { data } = await apiClient.get<DashboardSummary>("/reports/dashboard-summary", { params });
  return data;
}

export interface EndOfDayReport {
  date: string;
  revenue: number;
  invoiceCount: number;
  cancelledCount: number;
  paymentBreakdown: { method: string; amount: number }[];
}

export async function fetchEndOfDay(params: { branchId?: string; date: string }) {
  const { data } = await apiClient.get<EndOfDayReport>("/reports/end-of-day", { params });
  return data;
}

export interface CategoryPerformance {
  categoryId: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export async function fetchCategoryPerformance(params: ReportRange) {
  const { data } = await apiClient.get<{ data: CategoryPerformance[] }>("/reports/category-performance", { params });
  return data.data;
}

export interface CustomerInsights {
  totalCustomers: number;
  buyingCustomers: number;
  avgRevenuePerCustomer: number;
  debtCustomerCount: number;
  totalDebt: number;
}

export async function fetchCustomerInsights(params: ReportRange) {
  const { data } = await apiClient.get<CustomerInsights>("/reports/customer-insights", { params });
  return data;
}

export interface SellerPerformance {
  userId: string;
  username: string;
  revenue: number;
  invoiceCount: number;
}

export async function fetchSellerPerformance(params: ReportRange) {
  const { data } = await apiClient.get<{ data: SellerPerformance[] }>("/reports/seller-performance", { params });
  return data.data;
}
