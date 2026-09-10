import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { usePrintReceiptStore, type ReceiptData } from "@/stores/print-receipt-store";

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
  const printReceipt = usePrintReceiptStore((s) => s.print);

  function handlePrint() {
    if (!data) return;
    printReceipt(data);
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
