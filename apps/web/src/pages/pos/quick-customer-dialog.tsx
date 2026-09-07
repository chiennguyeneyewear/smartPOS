import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickCustomerSchema, type QuickCustomerInput, type CustomerSummary } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuickCreateCustomer } from "@/features/customers/hooks";

interface QuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CustomerSummary) => void;
}

export function QuickCustomerDialog({ open, onOpenChange, onCreated }: QuickCustomerDialogProps) {
  const quickCreate = useQuickCreateCustomer();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCustomerInput>({ resolver: zodResolver(quickCustomerSchema) });

  const onSubmit = handleSubmit((data) => {
    quickCreate.mutate(data, {
      onSuccess: (customer) => {
        onCreated(customer);
        reset();
        onOpenChange(false);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng nhanh</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="qc-name">Tên khách hàng</Label>
            <Input id="qc-name" autoFocus {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-phone">Số điện thoại</Label>
            <Input id="qc-phone" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={quickCreate.isPending}>
              {quickCreate.isPending ? "Đang lưu..." : "Lưu khách hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
