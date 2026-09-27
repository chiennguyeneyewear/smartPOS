import { apiClient } from "@/lib/api-client";

export interface CashSheetSummary {
  id: string;
  date: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export const CASH_SHEET_LIMITS = {
  maxBytes: 15 * 1024 * 1024,
  maxPerDay: 10,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
} as const;

export async function fetchCashSheets(date: string): Promise<CashSheetSummary[]> {
  const { data } = await apiClient.get<{ data: CashSheetSummary[] }>("/cash-sheets", { params: { date } });
  return data.data;
}

export async function uploadCashSheet(date: string, file: File): Promise<CashSheetSummary> {
  const { data } = await apiClient.post<CashSheetSummary>("/cash-sheets", file, {
    params: { date, filename: file.name },
    headers: { "Content-Type": file.type },
  });
  return data;
}

// Fetched through axios (not a plain link) so the auth header goes along.
export async function fetchCashSheetBlob(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/cash-sheets/${id}/file`, { responseType: "blob" });
  return data;
}

export async function deleteCashSheet(id: string): Promise<void> {
  await apiClient.delete(`/cash-sheets/${id}`);
}
