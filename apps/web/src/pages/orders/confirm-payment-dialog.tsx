import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_PAYMENT_LINES, type PaymentMethod } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, formatMoney, parseMoney } from "@/components/shared/money-input";
import { PAYMENT_LABELS } from "@/lib/payment";
import { cn, formatCurrency } from "@/lib/utils";
import { useAddInvoicePayment, useConfirmInvoicePayment } from "@/features/sales/hooks";
import type { InvoiceListItem } from "@/features/sales/api";

interface Line {
  method: PaymentMethod;
  amount: string;
  reference: string;
}

// Records how an invoice was really paid, split over up to 4 lines (for example 500,000 cash plus 500,000
// transfer). The lines must add up to exactly what is owed, so this only redistributes money and can
// never change the invoice total.
export function ConfirmPaymentDialog({
  invoice,
  isAdmin,
  mode = "set",
  onClose,
}: {
  invoice: InvoiceListItem | null;
  isAdmin: boolean;
  // "set": record / correct how the invoice was paid. "add": collect more on a partly paid invoice.
  mode?: "set" | "add";
  onClose: () => void;
}) {
  const setPayment = useConfirmInvoicePayment();
  const addPayment = useAddInvoicePayment();
  const confirm = mode === "add" ? addPayment : setPayment;
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);

  const owed = invoice ? invoice.totalAmount - invoice.depositAmount : 0;
  const alreadyPaid = invoice ? invoice.payments.reduce((s, p) => s + p.amount, 0) : 0;
  // the most this dialog can record: everything owed ("set"), or what is still missing ("add")
  const expected = mode === "add" ? Math.max(0, owed - alreadyPaid) : owed;

  useEffect(() => {
    if (!invoice) return;
    setError(null);
    const existing =
      mode === "add"
        ? []
        : invoice.payments.map((p) => ({ method: p.method, amount: formatMoney(p.amount), reference: p.reference ?? "" }));
    setLines(existing.length > 0 ? existing : [{ method: "CASH", amount: formatMoney(expected), reference: "" }]);
  }, [invoice?.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const entered = lines.reduce((sum, l) => sum + parseMoney(l.amount), 0);
  const remaining = expected - entered;
  const balanced = Math.abs(remaining) <= 0.5;
  const over = remaining < -0.5;
  const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CARD"];
  if (isAdmin && invoice?.customer) methods.push("DEBT");

  function update(index: number, patch: Partial<Line>) {
    setError(null);
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { method: "BANK_TRANSFER", amount: formatMoney(Math.max(0, remaining)), reference: "" },
    ]);
  }

  function submit() {
    if (!invoice) return;
    if (lines.some((l) => parseMoney(l.amount) <= 0)) return setError("Mỗi dòng phải có số tiền lớn hơn 0");
    // Paying only part now is allowed (a deposit); paying more than what is owed is not.
    if (over) return setError(`Đang vượt ${formatCurrency(-remaining)} so với số tiền cần thanh toán`);
    confirm.mutate(
      {
        id: invoice.id,
        input: {
          payments: lines.map((l) => ({
            method: l.method,
            amount: parseMoney(l.amount),
            reference: l.reference.trim() || null,
          })),
        },
      },
      { onSuccess: onClose },
    );
  }

  const entering = lines.length > 0 && entered > 0;

  const pending = invoice?.paymentStatus === "PENDING";
  const title =
    mode === "add" ? "Thu thêm tiền" : pending ? "Xác nhận thanh toán" : "Sửa thanh toán";

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title} {invoice?.code}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng hóa đơn</span>
              <span className="tabular-nums">{formatCurrency(invoice?.totalAmount ?? 0)}</span>
            </div>
            {invoice && invoice.depositAmount > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Đã cọc trước (đơn {invoice.preorder?.code})</span>
                <span className="tabular-nums">- {formatCurrency(invoice.depositAmount)}</span>
              </div>
            )}
            {mode === "add" && alreadyPaid > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Đã thu trước đó</span>
                <span className="tabular-nums">- {formatCurrency(alreadyPaid)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-semibold">
              <span>{mode === "add" ? "Còn phải thu" : "Cần thanh toán"}</span>
              <span className="tabular-nums">{formatCurrency(expected)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="space-y-1.5 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Select value={line.method} onValueChange={(v) => update(i, { method: v as PaymentMethod })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <MoneyInput
                    value={line.amount}
                    onChange={(v) => update(i, { amount: v })}
                    placeholder="0"
                    className="flex-1"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label="Bỏ dòng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {line.method === "BANK_TRANSFER" && (
                  <Input
                    value={line.reference}
                    onChange={(e) => update(i, { reference: e.target.value })}
                    placeholder="Mã giao dịch / nội dung chuyển khoản (nên nhập)"
                  />
                )}
              </div>
            ))}
            {lines.length < MAX_PAYMENT_LINES && (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
                <Plus className="h-4 w-4" /> Thêm phương thức
              </Button>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Đã nhập {formatCurrency(entered)}</span>
            <span
              className={cn(
                "font-semibold",
                over ? "text-destructive" : balanced ? "text-success" : "text-amber-700",
              )}
            >
              {over
                ? `Vượt ${formatCurrency(-remaining)}`
                : balanced
                  ? "Đã đủ"
                  : `Còn phải thu sau này ${formatCurrency(remaining)}`}
            </span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {mode === "set" &&
            (pending ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Kiểm tra kỹ trước khi lưu: sau khi xác nhận, tài khoản thường sẽ không thể sửa lại (chỉ admin mới sửa được).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Mọi thay đổi được ghi lại: ai sửa, lúc nào, từ gì sang gì.</p>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bỏ qua
          </Button>
          <Button onClick={submit} disabled={confirm.isPending || !entering}>
            {confirm.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
