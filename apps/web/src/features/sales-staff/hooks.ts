import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SalesStaffInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import { errorMessage } from "@/lib/error-message";
import { createSalesStaff, deleteSalesStaff, fetchSalesStaff } from "./api";

export function useSalesStaff() {
  return useQuery({ queryKey: ["sales-staff"], queryFn: fetchSalesStaff, staleTime: 60_000 });
}

export function useCreateSalesStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SalesStaffInput) => createSalesStaff(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-staff"] });
      toast({ title: "Đã thêm nhân viên", variant: "success" });
    },
    onError: (error: unknown) => toast({ title: "Không thêm được nhân viên", description: errorMessage(error), variant: "destructive" }),
  });
}

export function useDeleteSalesStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSalesStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-staff"] });
      toast({ title: "Đã xóa nhân viên", variant: "success" });
    },
    onError: (error: unknown) => toast({ title: "Không xóa được nhân viên", description: errorMessage(error), variant: "destructive" }),
  });
}
