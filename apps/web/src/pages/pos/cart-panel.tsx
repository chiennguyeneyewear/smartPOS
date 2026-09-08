import { useMemo, useState } from "react";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { usePosStore, getLineTotal, getLineUnitDiscount, type PosTab } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LineDiscountPopover } from "./line-discount-popover";

interface CartPanelProps {
  tab: PosTab;
  onRequestCheckout: () => void;
}

export function CartPanel({ tab, onRequestCheckout }: CartPanelProps) {
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const removeItem = usePosStore((s) => s.removeItem);
  const [openDiscountLineId, setOpenDiscountLineId] = useState<string | null>(null);

  const subTotal = useMemo(() => tab.items.reduce((sum, item) => sum + getLineTotal(item), 0), [tab.items]);
  const total = Math.max(0, subTotal - tab.discountAmount);

  return (
    <div className="flex h-full flex-[3] min-w-[420px] flex-col">
      <div className="flex-1 overflow-auto">
        {tab.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Chưa có sản phẩm nào trong giỏ hàng.</p>
        ) : (
          <div>
            {[...tab.items]
              .map((line, i) => ({ line, number: i + 1 }))
              .reverse()
              .map(({ line, number }) => {
                const unitDiscount = getLineUnitDiscount(line);
                const hasDiscount = unitDiscount > 0;
                return (
                  <div key={line.lineId} className="border-b px-3 py-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-center text-sm text-muted-foreground">{number}</span>
                      <button
                        onClick={() => removeItem(tab.id, line.lineId)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span className="shrink-0 text-xs text-muted-foreground">{line.sku}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{line.name}</p>
                      <button
                        onClick={() => updateQuantity(tab.id, line.lineId, line.quantity + 1)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        title="Thêm 1"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenDiscountLineId(line.lineId)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Chiết khấu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <LineDiscountPopover
                          tabId={tab.id}
                          line={line}
                          open={openDiscountLineId === line.lineId}
                          onOpenChange={(open) => setOpenDiscountLineId(open ? line.lineId : null)}
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-3 pl-6">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateQuantity(tab.id, line.lineId, Number(e.target.value))}
                        className="h-7 w-14 rounded border px-1.5 text-sm"
                      />
                      <div className="flex-1 text-right">
                        <span className="text-sm">{formatCurrency(line.unitPrice)}</span>
                        {hasDiscount && (
                          <p className="text-xs text-destructive">
                            -
                            {line.discountType === "PERCENT"
                              ? `${line.discountValue.toFixed(2)}%`
                              : formatCurrency(line.discountValue)}
                          </p>
                        )}
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold">
                        {formatCurrency(getLineTotal(line))}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t p-4">
        <div className="flex items-center justify-between border-t pt-2.5">
          <span className="text-base font-medium text-muted-foreground">Tổng tiền hàng</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
        </div>
        <Button
          size="lg"
          className="w-full text-base"
          disabled={tab.items.length === 0}
          onClick={onRequestCheckout}
        >
          THANH TOÁN
        </Button>
      </div>
    </div>
  );
}
