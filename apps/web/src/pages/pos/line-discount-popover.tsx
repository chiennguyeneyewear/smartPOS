import { useEffect, useRef } from "react";
import { usePosStore, getLineUnitDiscount, type CartLine, type LineDiscountType } from "@/stores/pos-store";
import { cn, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LineDiscountPopoverProps {
  tabId: string;
  line: CartLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Every field here writes straight to the store on change (no local draft +
// commit-on-close step) so the cart total is always exactly what's in the
// store, even if checkout is triggered without ever clicking outside this
// popover first.
export function LineDiscountPopover({ tabId, line, open, onOpenChange }: LineDiscountPopoverProps) {
  const updateLinePrice = usePosStore((s) => s.updateLinePrice);
  const setLineDiscount = usePosStore((s) => s.setLineDiscount);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  if (!open) return null;

  const discountMax = line.discountType === "PERCENT" ? 100 : line.unitPrice;
  const sellPrice = line.unitPrice - getLineUnitDiscount(line);

  function setDiscountType(discountType: LineDiscountType) {
    const max = discountType === "PERCENT" ? 100 : line.unitPrice;
    setLineDiscount(tabId, line.lineId, discountType, Math.min(line.discountValue, max));
  }

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
          value={line.unitPrice}
          onChange={(e) => updateLinePrice(tabId, line.lineId, Math.max(0, Number(e.target.value)))}
          className="h-8 w-32 text-right text-xs"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Giảm giá</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={discountMax}
            value={line.discountValue}
            onChange={(e) =>
              setLineDiscount(
                tabId,
                line.lineId,
                line.discountType,
                Math.min(Math.max(0, Number(e.target.value)), discountMax),
              )
            }
            className="h-8 w-20 text-right text-xs"
          />
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setDiscountType("AMOUNT")}
              className={cn(
                "px-2 py-1.5 text-[11px] font-medium",
                line.discountType === "AMOUNT" ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              VND
            </button>
            <button
              type="button"
              onClick={() => setDiscountType("PERCENT")}
              className={cn(
                "px-2 py-1.5 text-[11px] font-medium",
                line.discountType === "PERCENT" ? "bg-primary text-primary-foreground" : "bg-background",
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
