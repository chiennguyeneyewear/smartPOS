import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { createSupplier, searchSuppliers, updateSupplier } from "./api";

export function useSuppliers(search = "") {
  return useQuery({ queryKey: ["suppliers", search], queryFn: () => searchSuppliers(search) });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Đã thêm nhà cung cấp", variant: "success" });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateSupplier>[1] }) =>
      updateSupplier(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Đã cập nhật nhà cung cấp", variant: "success" });
    },
  });
}
