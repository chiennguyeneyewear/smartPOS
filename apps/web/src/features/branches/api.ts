import { apiClient } from "@/lib/api-client";
import type { BranchSummary } from "@smartpos/shared";

export interface BranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export async function fetchBranches(): Promise<BranchSummary[]> {
  const { data } = await apiClient.get<{ data: BranchSummary[] }>("/branches");
  return data.data;
}

export async function createBranch(input: BranchInput): Promise<BranchSummary> {
  const { data } = await apiClient.post<BranchSummary>("/branches", input);
  return data;
}

export async function updateBranch(
  id: string,
  input: Partial<BranchInput & { isActive: boolean }>,
): Promise<BranchSummary> {
  const { data } = await apiClient.patch<BranchSummary>(`/branches/${id}`, input);
  return data;
}
