import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { formatCurrency } from "@/lib/utils";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  totalAmount: number;
  isSubmitting: boolean;
  onConfirm: (input: { depositAmount: number; prescription: string; note: string }) => void;
}

// Taking a customer's order with a deposit. Only the amount is asked for here; how the deposit was paid
// (cash, transfer...) is confirmed afterwards from the Đặt hàng page, so the customer isn't quizzed at the till.
export function DepositDialog({ open, onOpenChange, customerName, totalAmount, isSubmitting, onConfirm }: DepositDialogProps) {
  const [deposit, setDeposit] = useState("");
  const [prescription, setPrescription] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDeposit("");
      setPrescription("");
      setNote("");
      setError(null);
    }
  }, [open]);

  const amount = parseMoney(deposit);

  function submit() {
    if (amount <= 0) return setError("Nhập số tiền khách đặt cọc");
    if (amount > totalAmount) return setError("Tiền cọc không được lớn hơn tổng giá trị đơn");
    setError(null);
    onConfirm({ depositAmount: amount, prescription: prescription.trim(), note: note.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt cọc</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khách hàng</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Tổng giá trị đơn</span>
              <span className="font-medium tabular-nums">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Khách đặt cọc</Label>
            <MoneyInput value={deposit} onChange={setDeposit} placeholder="0" autoFocus />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Còn lại khi lấy hàng</span>
            <span className="font-semibold tabular-nums">{formatCurrency(Math.max(0, totalAmount - amount))}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Thông số độ kính (nếu có)</Label>
            <Input value={prescription} onChange={(e) => setPrescription(e.target.value)} placeholder="Cận, viễn, loạn, trục, khoảng cách hai mắt..." />
          </div>
          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bỏ qua
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu đơn đặt cọc"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
