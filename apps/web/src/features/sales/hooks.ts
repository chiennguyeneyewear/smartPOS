import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckoutInvoiceInput, ConfirmPaymentInput, SaveInvoiceInput } from "@smartpos/shared";
import { errorMessage } from "@/lib/error-message";
import { toast } from "@/stores/toast-store";
import {
  checkoutInvoice,
  confirmInvoicePayment,
  createDraftInvoice,
  fetchInvoices,
  updateDraftInvoice,
  voidInvoice,
  voidInvoices,
} from "./api";

export function useInvoices(params: {
  branchId?: string;
  status?: string;
  customerId?: string;
  createdById?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({ queryKey: ["invoices", params], queryFn: () => fetchInvoices(params) });
}

export function useCreateDraftInvoice() {
  return useMutation({ mutationFn: createDraftInvoice });
}

export function useUpdateDraftInvoice() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveInvoiceInput }) => updateDraftInvoice(id, input),
  });
}

export function useCheckoutInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CheckoutInvoiceInput }) => checkoutInvoice(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Đã ra hóa đơn", variant: "success" });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({ title: "Thanh toán thất bại", description: message, variant: "destructive" });
    },
  });
}

export function useConfirmInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmPaymentInput }) => confirmInvoicePayment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Đã lưu thanh toán", variant: "success" });
    },
    onError: (error: unknown) =>
      toast({ title: "Không lưu được thanh toán", description: errorMessage(error), variant: "destructive" }),
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Đã hủy hóa đơn", variant: "success" });
    },
  });
}

export function useVoidInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidInvoices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Đã hủy hóa đơn", variant: "success" });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({ title: "Hủy hóa đơn thất bại", description: message, variant: "destructive" });
    },
  });
}
