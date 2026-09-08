import { useEffect, useRef } from "react";
import { usePosStore, getLineUnitDiscount, type CartLine, type LineDiscountType } from "@/stores/pos-store";
import { cn } from "@/lib/utils";

interface LineDiscountPopoverProps {
  tabId: string;
  line: CartLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// This popover matches the reference exactly: plain comma-grouped numbers
// (no ₫ suffix, no vi-VN dot separator), unlike formatCurrency used
// everywhere else in the app.
function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/[^\d]/g, "")) || 0;
}

// A fixed-width label column keeps every row's underline starting at the
// same x position regardless of label length ("Giảm giá" vs "Đơn giá"). The
// value cell itself is full-width so Đơn giá/Giá bán's underline reaches the
// popover's edge, while Giảm giá's input stays short (its own fixed width)
// so the VND/% toggle sits right after it instead of overflowing the row.
const gridClass = "grid grid-cols-[max-content_1fr] items-center gap-x-3";

const lineInputClass =
  "w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-1 text-sm text-foreground shadow-none outline-none focus-visible:border-primary";

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
      className="absolute right-0 top-full z-30 mt-1 w-80 space-y-4 rounded-xl border bg-popover p-4 shadow-lg"
    >
      <div className={gridClass}>
        <span className="whitespace-nowrap text-sm font-semibold text-foreground">Đơn giá</span>
        <input
          type="text"
          inputMode="numeric"
          value={formatNumber(line.unitPrice)}
          onChange={(e) => updateLinePrice(tabId, line.lineId, Math.max(0, parseNumber(e.target.value)))}
          className={cn(lineInputClass, "text-right font-medium")}
        />
      </div>
      <div className={gridClass}>
        <span className="whitespace-nowrap text-sm font-semibold text-foreground">Giảm giá</span>
        <div className="flex items-center justify-end gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={line.discountValue ? formatNumber(line.discountValue) : ""}
            onChange={(e) =>
              setLineDiscount(
                tabId,
                line.lineId,
                line.discountType,
                Math.min(Math.max(0, parseNumber(e.target.value)), discountMax),
              )
            }
            className={cn(lineInputClass, "w-16 shrink-0 text-left")}
          />
          <button
            type="button"
            onClick={() => setDiscountType("AMOUNT")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              line.discountType === "AMOUNT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            VND
          </button>
          <button
            type="button"
            onClick={() => setDiscountType("PERCENT")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              line.discountType === "PERCENT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            %
          </button>
        </div>
      </div>
      <div className={gridClass}>
        <span className="whitespace-nowrap text-sm font-semibold text-foreground">Giá bán</span>
        <span className={cn(lineInputClass, "inline-block text-right font-medium leading-6")}>
          {formatNumber(sellPrice)}
        </span>
      </div>
    </div>
  );
}
