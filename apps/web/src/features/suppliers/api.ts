import type { SupplierInput, SupplierSummary } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export async function searchSuppliers(search: string): Promise<SupplierSummary[]> {
  const { data } = await apiClient.get<{ data: SupplierSummary[] }>("/suppliers", { params: { search } });
  return data.data;
}

export async function createSupplier(input: SupplierInput): Promise<SupplierSummary> {
  const { data } = await apiClient.post<SupplierSummary>("/suppliers", input);
  return data;
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<SupplierSummary> {
  const { data } = await apiClient.patch<SupplierSummary>(`/suppliers/${id}`, input);
  return data;
}
