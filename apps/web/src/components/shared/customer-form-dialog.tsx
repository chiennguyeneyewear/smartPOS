import { useEffect } from "react";
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
  // Carries over what was already typed in a search box that came up empty (a phone number or a name),
  // so the customer isn't asked for it a second time.
  defaultValues?: Partial<CustomerInput>;
}

export function CustomerFormDialog({ open, onOpenChange, onCreated, defaultValues }: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomer();

  const form = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
        </DialogHeader>
        <CustomerForm form={form} onSubmit={onSubmit} onCancel={handleClose} submitting={createCustomer.isPending} />
      </DialogContent>
    </Dialog>
  );
}
