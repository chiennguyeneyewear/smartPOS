import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { createBranch, fetchBranches, updateBranch, type BranchInput } from "./api";

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

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BranchInput & { isActive: boolean }> }) =>
      updateBranch(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Đã cập nhật chi nhánh", variant: "success" });
    },
  });
}
