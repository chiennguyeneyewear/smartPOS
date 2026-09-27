import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpenseInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import { errorMessage } from "@/lib/error-message";
import { createExpense, deleteExpense, fetchExpenses, fetchPayers, updateExpense } from "./api";

export function useExpenses(params: { date: string; branchIds?: string }) {
  return useQuery({ queryKey: ["expenses", params], queryFn: () => fetchExpenses(params) });
}

export function usePayers() {
  return useQuery({ queryKey: ["expense-payers"], queryFn: fetchPayers, staleTime: 60_000 });
}

function useChanging<TArgs>(fn: (args: TArgs) => Promise<unknown>, success: string, failure: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-payers"] });
      toast({ title: success, variant: "success" });
    },
    onError: (error: unknown) => toast({ title: failure, description: errorMessage(error), variant: "destructive" }),
  });
}

export const useCreateExpense = () => useChanging((input: ExpenseInput) => createExpense(input), "Đã ghi khoản chi", "Không ghi được khoản chi");
export const useUpdateExpense = () =>
  useChanging(({ id, input }: { id: string; input: ExpenseInput }) => updateExpense(id, input), "Đã sửa khoản chi", "Không sửa được");
export const useDeleteExpense = () => useChanging((id: string) => deleteExpense(id), "Đã xóa khoản chi", "Không xóa được");
