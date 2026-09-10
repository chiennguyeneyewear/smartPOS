import { useState } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { usePrintReceiptStore, type ReceiptData, type ReceiptFormat } from "@/stores/print-receipt-store";

const FORMAT_OPTIONS: { value: ReceiptFormat; label: string }[] = [
  { value: "thermal80", label: "Khổ 80mm" },
  { value: "a5", label: "Khổ A5" },
];

const LAST_FORMAT_KEY = "smartpos-last-receipt-format";

function loadLastFormat(): ReceiptFormat {
  const stored = localStorage.getItem(LAST_FORMAT_KEY);
  return stored === "a5" ? "a5" : "thermal80";
}

interface PrintReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
  title?: string;
  description?: string;
}

export function PrintReceiptDialog({
  open,
  onOpenChange,
  data,
  title = "In hóa đơn",
  description,
}: PrintReceiptDialogProps) {
  const [format, setFormat] = useState<ReceiptFormat>(loadLastFormat);
  const printReceipt = usePrintReceiptStore((s) => s.print);

  function handlePrint() {
    if (!data) return;
    localStorage.setItem(LAST_FORMAT_KEY, format);
    printReceipt(data, format);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        {data && (
          <div className="rounded-md bg-secondary p-3 text-center">
            <p className="text-xs text-muted-foreground">Mã hóa đơn: {data.code}</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.totalAmount)}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Khổ giấy</p>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setFormat(option.value)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm",
                  format === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={handlePrint} disabled={!data} className="gap-1.5">
            <Printer className="h-4 w-4" /> In hóa đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
