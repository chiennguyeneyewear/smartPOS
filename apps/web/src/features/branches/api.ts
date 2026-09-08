import { apiClient } from "@/lib/api-client";
import type { BranchSummary } from "@smartpos/shared";

export async function fetchBranches(): Promise<BranchSummary[]> {
  const { data } = await apiClient.get<{ data: BranchSummary[] }>("/branches");
  return data.data;
}
