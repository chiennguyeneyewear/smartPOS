import type { CreateStockMovementInput, ProductSummary, StockMovementSummary } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface StockRow {
  productId: string;
  branchId: string;
  quantity: number;
  product: ProductSummary & { reorderThreshold: number | null };
}

export async function fetchStock(params: {
  branchId: string;
  lowStock?: boolean;
  search?: string;
}): Promise<StockRow[]> {
  const { data } = await apiClient.get<{ data: StockRow[] }>("/inventory/stock", { params });
  return data.data;
}

export async function createStockMovement(input: CreateStockMovementInput) {
  const { data } = await apiClient.post("/inventory/movements", input);
  return data;
}

export async function fetchMovements(params: {
  branchId?: string;
  type?: string;
}): Promise<StockMovementSummary[]> {
  const { data } = await apiClient.get<{ data: StockMovementSummary[] }>("/inventory/movements", { params });
  return data.data;
}
