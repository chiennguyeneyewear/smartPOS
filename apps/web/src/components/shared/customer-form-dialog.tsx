import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput, type CustomerSummary } from "@smartpos/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/shared/customer-form";
import { useCreateCustomer } from "@/features/customers/hooks";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customer: CustomerSummary) => void;
}

export function CustomerFormDialog({ open, onOpenChange, onCreated }: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomer();

  const form = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  function handleClose() {
    form.reset();
    onOpenChange(false);
  }

  function onSubmit() {
    form.handleSubmit((values) => {
      createCustomer.mutate(values, {
        onSuccess: (customer) => {
          onCreated?.(customer);
          handleClose();
        },
      });
    })();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
        </DialogHeader>
        <CustomerForm form={form} onSubmit={onSubmit} onCancel={handleClose} submitting={createCustomer.isPending} />
      </DialogContent>
    </Dialog>
  );
}
