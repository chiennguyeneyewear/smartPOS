import type { UseFormReturn } from "react-hook-form";
import type { CustomerInput } from "@smartpos/shared";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const lineInputClass = "rounded-none border-0 border-b border-input px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary";

interface CustomerFormProps {
  form: UseFormReturn<CustomerInput>;
  code?: string;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CustomerForm({ form, code, onSubmit, onCancel, submitting, submitLabel = "Lưu" }: CustomerFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-bold">Mã khách hàng</Label>
            <Input value={code ?? "Tự động"} disabled className={cn(lineInputClass, "text-muted-foreground")} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">Tên khách hàng</Label>
            <Input autoFocus className={lineInputClass} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            <Input className={lineInputClass} {...register("name2")} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold">Điện thoại</Label>
            <Input className={lineInputClass} {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            <Input className={lineInputClass} {...register("phone2")} />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label className="font-bold">Ghi chú</Label>
          <Textarea {...register("note")} className="flex-1 resize-none" />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Bỏ qua
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
