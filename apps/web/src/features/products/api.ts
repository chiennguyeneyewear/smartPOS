import type {
  CategorySummary,
  PagedResult,
  ProductImportRow,
  ProductCreateInput,
  ProductImportResult,
  ProductInput,
  ProductSummary,
  UnitSummary,
} from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface ProductQuery {
  search?: string;
  note?: string;
  categoryId?: string;
  barcode?: string;
  branchId?: string;
  sellable?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchProducts(query: ProductQuery): Promise<PagedResult<ProductSummary>> {
  const { data } = await apiClient.get<PagedResult<ProductSummary>>("/products", { params: query });
  return data;
}

export async function createProduct(input: ProductCreateInput): Promise<ProductSummary> {
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

export async function importProducts(rows: ProductImportRow[], branchId?: string): Promise<ProductImportResult> {
  const { data } = await apiClient.post<ProductImportResult>("/products/import", { rows, branchId });
  return data;
}

export async function createCategory(name: string): Promise<CategorySummary> {
  const { data } = await apiClient.post<CategorySummary>("/categories", { name });
  return data;
}

export async function uploadProductImage(productId: string, file: File): Promise<{ id: string; mimeType: string }> {
  const { data } = await apiClient.post<{ id: string; mimeType: string }>(`/products/${productId}/images`, file, {
    params: { filename: file.name },
    headers: { "Content-Type": file.type },
  });
  return data;
}

// Fetched through axios (not an <img src>) so the auth header goes along.
export async function fetchProductImageBlob(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/product-images/${id}`, { responseType: "blob" });
  return data;
}

export async function deleteProductImage(id: string): Promise<void> {
  await apiClient.delete(`/product-images/${id}`);
}
