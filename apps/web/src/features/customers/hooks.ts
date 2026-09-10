import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerInput } from "@smartpos/shared";
import { toast } from "@/stores/toast-store";
import { createCustomer, fetchCustomer, fetchDebtHistory, searchCustomers, updateCustomer } from "./api";

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
