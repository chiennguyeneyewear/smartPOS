import { useEffect, useRef, useState } from "react";
import { usePosStore, getLineUnitDiscount, type CartLine, type LineDiscountType } from "@/stores/pos-store";
import { cn, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LineDiscountPopoverProps {
  tabId: string;
  line: CartLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LineDiscountPopover({ tabId, line, open, onOpenChange }: LineDiscountPopoverProps) {
  const updateLinePrice = usePosStore((s) => s.updateLinePrice);
  const setLineDiscount = usePosStore((s) => s.setLineDiscount);
  const containerRef = useRef<HTMLDivElement>(null);

  const [unitPrice, setUnitPrice] = useState(line.unitPrice);
  const [discountValue, setDiscountValue] = useState(line.discountValue);
  const [discountType, setDiscountType] = useState<LineDiscountType>(line.discountType);

  useEffect(() => {
    if (open) {
      setUnitPrice(line.unitPrice);
      setDiscountValue(line.discountValue);
      setDiscountType(line.discountType);
    }
  }, [open, line.unitPrice, line.discountValue, line.discountType]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit();
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unitPrice, discountValue, discountType]);

  function commit() {
    updateLinePrice(tabId, line.lineId, unitPrice);
    setLineDiscount(tabId, line.lineId, discountType, discountValue);
  }

  if (!open) return null;

  const previewLine = { ...line, unitPrice, discountType, discountValue };
  const sellPrice = Math.max(0, unitPrice - getLineUnitDiscount(previewLine));

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full z-30 mt-1 w-64 space-y-3 rounded-md border bg-popover p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Đơn giá</span>
        <Input
          type="number"
          min={0}
          value={unitPrice}
          onChange={(e) => setUnitPrice(Number(e.target.value))}
          className="h-8 w-32 text-right text-xs"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Giảm giá</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className="h-8 w-20 text-right text-xs"
          />
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setDiscountType("AMOUNT")}
              className={cn(
                "px-2 py-1.5 text-[11px] font-medium",
                discountType === "AMOUNT" ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              VND
            </button>
            <button
              type="button"
              onClick={() => setDiscountType("PERCENT")}
              className={cn(
                "px-2 py-1.5 text-[11px] font-medium",
                discountType === "PERCENT" ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              %
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-xs text-muted-foreground">Giá bán</span>
        <span className="text-sm font-semibold">{formatCurrency(sellPrice)}</span>
      </div>
    </div>
  );
}
