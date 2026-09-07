import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { PAYMENT_METHOD, type PaymentMethod } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  hasCustomer: boolean;
  isSubmitting: boolean;
  onConfirm: (payments: { method: PaymentMethod; amount: number }[]) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  totalAmount,
  hasCustomer,
  isSubmitting,
  onConfirm,
}: CheckoutDialogProps) {
  const [rows, setRows] = useState<PaymentRow[]>([]);

  useEffect(() => {
    if (open) {
      setRows([{ id: crypto.randomUUID(), method: PAYMENT_METHOD.CASH, amount: totalAmount }]);
    }
  }, [open, totalAmount]);

  const paid = rows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const remaining = totalAmount - paid;
  const hasDebtRow = rows.some((r) => r.method === PAYMENT_METHOD.DEBT);
  const canSubmit = remaining <= 0 || (hasDebtRow && hasCustomer);

  function updateRow(id: string, patch: Partial<PaymentRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), method: PAYMENT_METHOD.CASH, amount: Math.max(0, remaining) },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Tổng tiền cần thanh toán</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Select value={row.method} onValueChange={(v) => updateRow(row.id, { method: v as PaymentMethod })}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={row.amount}
                onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                className="flex-1"
              />
              {rows.length > 1 && (
                <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={addRow}>
            + Thêm phương thức thanh toán
          </Button>
        </div>

        {hasDebtRow && !hasCustomer && (
          <p className="text-xs text-destructive">Cần chọn khách hàng để ghi nợ.</p>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">{remaining > 0 ? "Còn thiếu" : "Tiền thừa trả khách"}</span>
          <span className={remaining > 0 ? "font-semibold text-destructive" : "font-semibold text-success"}>
            {formatCurrency(Math.abs(remaining))}
          </span>
        </div>

        <DialogFooter>
          <Button
            disabled={!canSubmit || isSubmitting}
            onClick={() =>
              onConfirm(rows.filter((r) => r.amount > 0).map((r) => ({ method: r.method, amount: r.amount })))
            }
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
