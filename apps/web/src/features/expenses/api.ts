import type { ExpenseInput } from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export interface ExpenseSummary {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  amount: number;
  payer: string;
  content: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export async function fetchExpenses(params: { date: string; branchIds?: string }): Promise<ExpenseSummary[]> {
  const { data } = await apiClient.get<{ data: ExpenseSummary[] }>("/expenses", { params });
  return data.data;
}

export async function fetchPayers(): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>("/expenses/payers");
  return data.data;
}

export async function createExpense(input: ExpenseInput): Promise<ExpenseSummary> {
  const { data } = await apiClient.post<ExpenseSummary>("/expenses", input);
  return data;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ExpenseSummary> {
  const { data } = await apiClient.patch<ExpenseSummary>(`/expenses/${id}`, input);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
