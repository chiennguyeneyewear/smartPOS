import type { CategorySummary, PagedResult, ProductInput, ProductSummary, UnitSummary } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  barcode?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchProducts(query: ProductQuery): Promise<PagedResult<ProductSummary>> {
  const { data } = await apiClient.get<PagedResult<ProductSummary>>("/products", { params: query });
  return data;
}

export async function createProduct(input: ProductInput): Promise<ProductSummary> {
  const { data } = await apiClient.post<ProductSummary>("/products", input);
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<ProductSummary> {
  const { data } = await apiClient.patch<ProductSummary>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const { data } = await apiClient.get<{ data: CategorySummary[] }>("/categories");
  return data.data;
}

export async function fetchUnits(): Promise<UnitSummary[]> {
  const { data } = await apiClient.get<{ data: UnitSummary[] }>("/units");
  return data.data;
}
