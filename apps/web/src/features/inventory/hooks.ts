import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { createStockMovement, fetchMovements, fetchStock } from "./api";

export function useStock(params: { branchId: string; lowStock?: boolean; search?: string }) {
  return useQuery({
    queryKey: ["inventory", "stock", params],
    queryFn: () => fetchStock(params),
    enabled: !!params.branchId,
  });
}

export function useMovements(params: { branchId?: string; type?: string }) {
  return useQuery({ queryKey: ["inventory", "movements", params], queryFn: () => fetchMovements(params) });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Đã ghi nhận phiếu kho", variant: "success" });
    },
    onError: () => {
      toast({ title: "Không thể tạo phiếu kho", variant: "destructive" });
    },
  });
}
