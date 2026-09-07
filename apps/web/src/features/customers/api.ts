import type { CustomerInput, CustomerSummary } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export async function searchCustomers(search: string): Promise<CustomerSummary[]> {
  const { data } = await apiClient.get<{ data: CustomerSummary[] }>("/customers", { params: { search } });
  return data.data;
}

export async function createCustomer(input: CustomerInput): Promise<CustomerSummary> {
  const { data } = await apiClient.post<CustomerSummary>("/customers", input);
  return data;
}

export async function fetchDebtHistory(customerId: string) {
  const { data } = await apiClient.get(`/customers/${customerId}/debt-history`);
  return data.data as { id: string; amount: number; note: string | null; createdAt: string }[];
}
