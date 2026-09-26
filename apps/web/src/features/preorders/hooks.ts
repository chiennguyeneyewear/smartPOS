import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { errorMessage } from "@/lib/error-message";
import { cancelPreorder, confirmPreorderDeposit, createPreorder, deliverPreorder, fetchPreorders } from "./api";

export function usePreorders(params: { status?: string }, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["preorders", params],
    queryFn: () => fetchPreorders(params),
    enabled: options.enabled ?? true,
  });
}

function useRefreshing<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, success: string, failure: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: success, variant: "success" });
    },
    onError: (error: unknown) => toast({ title: failure, description: errorMessage(error), variant: "destructive" }),
  });
}

export const useCreatePreorder = () =>
  useRefreshing(createPreorder, "Đã lưu đơn đặt cọc", "Không lưu được đơn đặt cọc");
export const useConfirmPreorderDeposit = () =>
  useRefreshing(
    ({ id, ...input }: { id: string; method: "CASH" | "BANK_TRANSFER" | "CARD"; reference?: string | null }) =>
      confirmPreorderDeposit(id, input),
    "Đã xác nhận tiền cọc",
    "Không xác nhận được tiền cọc",
  );
export const useDeliverPreorder = () =>
  useRefreshing(
    ({ id, ...input }: { id: string; branchId: string; discountAmount: number }) => deliverPreorder(id, input),
    "Đã giao hàng và ra hóa đơn",
    "Không giao được hàng",
  );
export const useCancelPreorder = () =>
  useRefreshing(
    ({ id, ...input }: { id: string; reason: string; refundAmount: number }) => cancelPreorder(id, input),
    "Đã hủy đơn đặt hàng",
    "Không hủy được đơn",
  );
