import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerImportRow, CustomerInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import { createCustomer, fetchCustomer, fetchDebtHistory, importCustomers, searchCustomers, updateCustomer } from "./api";

export function useCustomerSearch(search: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: () => searchCustomers(search),
    enabled: search.length > 0,
  });
}

export function useCustomerList(search = "") {
  return useQuery({ queryKey: ["customers", "list", search], queryFn: () => searchCustomers(search) });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CustomerInput> }) => updateCustomer(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", id] });
      toast({ title: "Đã lưu thông tin khách hàng", variant: "success" });
    },
  });
}

export function useImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: CustomerImportRow[]) => importCustomers(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      const errorNote = result.errors.length > 0 ? `, ${result.errors.length} lỗi` : "";
      toast({
        title: "Import hoàn tất",
        description: `${result.created} khách hàng mới, ${result.updated} cập nhật${errorNote}`,
        variant: result.errors.length > 0 ? "default" : "success",
      });
    },
  });
}

export function useCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => fetchCustomer(customerId!),
    enabled: !!customerId,
  });
}

export function useDebtHistory(customerId: string) {
  return useQuery({
    queryKey: ["customers", customerId, "debt-history"],
    queryFn: () => fetchDebtHistory(customerId),
    enabled: !!customerId,
  });
}
