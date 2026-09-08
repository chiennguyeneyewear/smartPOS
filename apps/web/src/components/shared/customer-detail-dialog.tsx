import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerDetailTabs } from "@/components/shared/customer-detail-tabs";
import { useCustomer } from "@/features/customers/hooks";

interface CustomerDetailDialogProps {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailDialog({ customerId, onOpenChange }: CustomerDetailDialogProps) {
  const { data: customer } = useCustomer(customerId);

  return (
    <Dialog open={!!customerId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {customer ? `${customer.name} · ${customer.code}` : "Chi tiết khách hàng"}
          </DialogTitle>
        </DialogHeader>
        {customerId && <CustomerDetailTabs customerId={customerId} />}
      </DialogContent>
    </Dialog>
  );
}
