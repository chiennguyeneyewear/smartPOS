import { apiClient } from "@/lib/api-client";
import type { BranchSummary } from "@smartpos/shared";

export async function fetchBranches(): Promise<BranchSummary[]> {
  const { data } = await apiClient.get<{ data: BranchSummary[] }>("/branches");
  return data.data;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export async function createBranch(input: CreateBranchInput): Promise<BranchSummary> {
  const { data } = await apiClient.post<BranchSummary>("/branches", input);
  return data;
}
