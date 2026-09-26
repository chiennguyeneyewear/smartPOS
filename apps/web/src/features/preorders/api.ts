import type {
  PreorderCancelInput,
  PreorderCreateInput,
  PreorderDeliverInput,
  PreorderDepositConfirmInput,
  PreorderSummary,
} from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchPreorders(params: { status?: string }): Promise<PreorderSummary[]> {
  const { data } = await apiClient.get<{ data: PreorderSummary[] }>("/preorders", { params });
  return data.data;
}

export async function createPreorder(input: PreorderCreateInput): Promise<PreorderSummary> {
  const { data } = await apiClient.post<PreorderSummary>("/preorders", input);
  return data;
}

export async function confirmPreorderDeposit(id: string, input: PreorderDepositConfirmInput): Promise<PreorderSummary> {
  const { data } = await apiClient.post<PreorderSummary>(`/preorders/${id}/deposit-confirm`, input);
  return data;
}

export async function deliverPreorder(id: string, input: PreorderDeliverInput): Promise<PreorderSummary> {
  const { data } = await apiClient.post<PreorderSummary>(`/preorders/${id}/deliver`, input);
  return data;
}

export async function cancelPreorder(id: string, input: PreorderCancelInput): Promise<PreorderSummary> {
  const { data } = await apiClient.post<PreorderSummary>(`/preorders/${id}/cancel`, input);
  return data;
}
