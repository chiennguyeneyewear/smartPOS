import type { SalesStaffInput, SalesStaffSummary } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchSalesStaff(): Promise<SalesStaffSummary[]> {
  const { data } = await apiClient.get<{ data: SalesStaffSummary[] }>("/sales-staff");
  return data.data;
}

export async function createSalesStaff(input: SalesStaffInput): Promise<SalesStaffSummary> {
  const { data } = await apiClient.post<SalesStaffSummary>("/sales-staff", input);
  return data;
}

export async function deleteSalesStaff(id: string): Promise<void> {
  await apiClient.delete(`/sales-staff/${id}`);
}
