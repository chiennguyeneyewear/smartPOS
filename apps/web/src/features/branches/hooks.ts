import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { createBranch, fetchBranches } from "./api";

export function useBranches() {
  return useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Đã thêm chi nhánh", variant: "success" });
    },
  });
}
